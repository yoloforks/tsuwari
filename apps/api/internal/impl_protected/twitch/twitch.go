package twitch

import (
	"context"
	"fmt"

	"github.com/nicklaw5/helix/v2"
	"github.com/satont/twir/apps/api/internal/impl_deps"
	"github.com/satont/twir/libs/grpc/generated/api/twitch_protected"
	"github.com/satont/twir/libs/twitch"
	"google.golang.org/protobuf/types/known/emptypb"
)

type Twitch struct {
	*impl_deps.Deps
}

func (c *Twitch) TwitchSearchCategories(
	ctx context.Context,
	req *twitch_protected.SearchCategoriesRequest,
) (*twitch_protected.SearchCategoriesResponse, error) {
	selectedDashboardId := c.SessionManager.Get(ctx, "dashboardId").(string)

	twitchClient, err := twitch.NewUserClientWithContext(
		ctx,
		selectedDashboardId,
		c.Config,
		c.Grpc.Tokens,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"cannot create user %s twitch client  token: %w",
			selectedDashboardId,
			err,
		)
	}

	categories, err := twitchClient.SearchCategories(
		&helix.SearchCategoriesParams{
			Query: req.Query,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("unepected error happend when fetching categories: %w", err)
	}
	if categories.ErrorMessage != "" {
		return nil, fmt.Errorf("cannot get categories: %s", categories.ErrorMessage)
	}

	mappedCategories := make(
		[]*twitch_protected.SearchCategoriesResponse_Category,
		len(categories.Data.Categories),
	)
	for i, category := range categories.Data.Categories {
		mappedCategories[i] = &twitch_protected.SearchCategoriesResponse_Category{
			Id:    category.ID,
			Name:  category.Name,
			Image: category.BoxArtURL,
		}
	}

	return &twitch_protected.SearchCategoriesResponse{
		Categories: mappedCategories,
	}, nil
}

func (c *Twitch) TwitchSetChannelInformation(
	ctx context.Context,
	req *twitch_protected.SetChannelInformationRequest,
) (
	*emptypb.Empty,
	error,
) {
	selectedDashboardId := c.SessionManager.Get(ctx, "dashboardId").(string)

	twitchClient, err := twitch.NewUserClientWithContext(
		ctx,
		selectedDashboardId,
		c.Config,
		c.Grpc.Tokens,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"cannot create user %s twitch client  token: %w",
			selectedDashboardId,
			err,
		)
	}

	res, err := twitchClient.EditChannelInformation(
		&helix.EditChannelInformationParams{
			BroadcasterID: selectedDashboardId,
			GameID:        req.CategoryId,
			Title:         req.Title,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("cannot update category: %w", err)
	}
	if res.ErrorMessage != "" {
		return nil, fmt.Errorf("cannot update category: %s", res.ErrorMessage)
	}

	return &emptypb.Empty{}, nil
}
