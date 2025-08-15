defmodule NobullfitWeb.Router do
  use NobullfitWeb, :router

  import NobullfitWeb.UserAuth
  import NobullfitWeb.Plugs.MaintenancePlug

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {NobullfitWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_scope_for_user
    plug :fetch_maintenance_status
    plug :check_maintenance_restrictions
    plug NobullfitWeb.Plugs.TimezonePlug
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", NobullfitWeb do
    pipe_through :browser

    live "/", HomeLive
    live "/guides", GuidesLive
    live "/about", AboutLive
    live "/privacy", PrivacyLive
    live "/terms", TermsLive
    get "/maintenance", MaintenanceController, :show
  end

  if Application.compile_env(:nobullfit, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: NobullfitWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  ## Authentication routes

  scope "/", NobullfitWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{NobullfitWeb.UserAuth, :require_authenticated}] do
      live "/d", DashboardLive
      live "/d/food", Dashboard.FoodLive
      live "/d/add-food", Dashboard.AddFoodLive
      live "/d/food-database", Dashboard.FoodDatabaseLive
      live "/d/recipe-database", Dashboard.RecipeDatabaseLive
      live "/d/favorites", Dashboard.FavoritesLive
      live "/d/nutrition-info/:food_id/:food_label/:quantity", Dashboard.NutritionInfoLive
      live "/d/progress", Dashboard.ProgressLive
      live "/d/groceries", Dashboard.GroceriesLive
      live "/users/settings", UserLive.Settings, :edit
      live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
    end

    post "/users/update-password", UserSessionController, :update_password
  end

  scope "/", NobullfitWeb do
    pipe_through [:browser]

    live_session :current_user,
      on_mount: [{NobullfitWeb.UserAuth, :mount_current_scope}] do
      live "/users/register", UserLive.Registration, :new
      live "/users/log-in", UserLive.Login, :new
      live "/users/log-in/:token", UserLive.Confirmation, :new
    end

    post "/users/log-in", UserSessionController, :create
    delete "/users/log-out", UserSessionController, :delete
  end
end
