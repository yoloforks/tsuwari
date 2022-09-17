import { HttpException, Injectable } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import { config } from '@tsuwari/config';
import { ClientProxy, MyRefreshingProvider, RedisService, TwitchApiService } from '@tsuwari/shared';
import { Bot, BotType } from '@tsuwari/typeorm/entities/Bot';
import { Channel } from '@tsuwari/typeorm/entities/Channel';
import { Token } from '@tsuwari/typeorm/entities/Token';
import { ApiClient } from '@twurple/api';

import { typeorm } from '../../index.js';

@Injectable()
export class BotService {
  @Client({ transport: Transport.NATS, options: { servers: [config.NATS_URL] } })
  nats: ClientProxy;

  constructor(private readonly redis: RedisService, private readonly twitchApi: TwitchApiService) {}

  async isBotMod(channelId: string) {
    const channel = await typeorm.getRepository(Channel).findOne({
      where: { id: channelId },
      relations: {
        bot: true,
        user: {
          token: true,
        },
      },
    });

    if (!channel?.bot || !channel.user?.token)
      throw new HttpException('Missed bot or broadcaster token on the channel', 400);

    const authProvider = new MyRefreshingProvider({
      clientId: config.TWITCH_CLIENTID,
      clientSecret: config.TWITCH_CLIENTSECRET,
      token: channel.user.token,
      repository: typeorm.getRepository(Token),
    });

    const token = await authProvider.getAccessToken();

    if (!token?.scope.includes('moderation:read')) {
      return !!(await this.redis.get(`isBotMod:${channelId}`));
    }

    const api = new ApiClient({ authProvider });

    const mods = await api.moderation.getModerators(channelId);
    const isMod = !!mods.data.find((m) => m.userId === channel.botId);

    const redisKey = `isBotMod:${channelId}`;
    if (isMod) {
      this.redis.set(redisKey, 'true');
    } else {
      this.redis.del(redisKey);
    }

    return isMod;
  }

  async botJoinOrLeave(action: 'join' | 'part', channelId: string) {
    const [channel, user] = await Promise.all([
      typeorm.getRepository(Channel).findOneBy({
        id: channelId,
      }),
      this.twitchApi.users.getUserByIdWithCache(channelId),
    ]);

    if (!user || !channel) throw new HttpException(`User not found`, 404);
    if (!channel.botId) {
      const defaultBot = await typeorm.getRepository(Bot).findOneBy({
        type: BotType.DEFAULT,
      });

      if (defaultBot) {
        await typeorm.getRepository(Channel).update(
          { id: channel.id },
          {
            botId: defaultBot.id,
          },
        );
      }
    }

    await Promise.all([
      typeorm.getRepository(Channel).update({ id: channel.id }, { isEnabled: action === 'join' }),
      this.nats
        .emit('bots.joinOrLeave', {
          action,
          botId: channel.botId,
          username: user.login,
        })
        .toPromise(),
    ]);
  }
}