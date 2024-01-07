package main

import (
	"github.com/satont/twir/apps/ytsr/app"
	"go.uber.org/fx"
)

func main() {
	fx.New(
		app.App,
	).Run()
}
