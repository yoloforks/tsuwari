package valorant

import (
	"context"
	"fmt"
	"strings"

	"github.com/samber/lo"
	"github.com/satont/twir/apps/parser/internal/types"
	model "github.com/satont/twir/libs/gomodels"
)

var Matches = &types.Variable{
	Name: "valorant.matches.trend",
	Description: lo.ToPtr(
		`Latest 5 matches trend, i.e "W(13/4) — Killjoy 12/4/10 | L(4/13) — Killjoy 4/12/10"`,
	),
	CanBeUsedInRegistry: true,
	Handler: func(
		ctx context.Context, parseCtx *types.VariableParseContext, variableData *types.VariableData,
	) (*types.VariableHandlerResult, error) {
		result := types.VariableHandlerResult{}

		integrations := parseCtx.Cacher.GetEnabledChannelIntegrations(ctx)
		integration, ok := lo.Find(
			integrations, func(item *model.ChannelsIntegrations) bool {
				return item.Integration.Service == "VALORANT"
			},
		)

		if !ok || integration.Data == nil || integration.Data.UserName == nil {
			return nil, nil
		}

		matches := parseCtx.Cacher.GetValorantMatches(ctx)
		if len(matches) == 0 {
			return nil, nil
		}

		var trend []string

		for _, match := range matches {
			if len(match.Players.AllPlayers) == 0 {
				continue
			}

			player, ok := lo.Find(
				match.Players.AllPlayers, func(el types.ValorantMatchPlayer) bool {
					return fmt.Sprintf("%s#%s", el.Name, el.Tag) == *integration.Data.UserName
				},
			)

			if !ok {
				continue
			}

			teamName := strings.ToLower(player.Team)
			team := match.Teams[teamName]
			isWin := team.HasWon
			char := player.Character
			KDA := fmt.Sprintf("%d/%d/%d", player.Stats.Kills, player.Stats.Deaths, player.Stats.Assists)
			matchResultString := "W"
			if !isWin {
				matchResultString = "L"
			}

			trend = append(
				trend,
				fmt.Sprintf(
					"%s(%d/%d) — %s %s",
					matchResultString,
					team.RoundsWon,
					team.RoundsLost,
					char,
					KDA,
				),
			)
		}

		result.Result = strings.Join(trend, " · ")

		return &result, nil
	},
}
