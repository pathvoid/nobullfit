import Config

config :nobullfit, :scopes,
  user: [
    default: true,
    module: Nobullfit.Accounts.Scope,
    assign_key: :current_scope,
    access_path: [:user, :id],
    schema_key: :user_id,
    schema_type: :id,
    schema_table: :users,
    test_data_fixture: Nobullfit.AccountsFixtures,
    test_setup_helper: :register_and_log_in_user
  ]

# Application configuration
config :nobullfit,
  ecto_repos: [Nobullfit.Repo],
  generators: [timestamp_type: :utc_datetime]

# Web endpoint configuration
config :nobullfit, NobullfitWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: NobullfitWeb.ErrorHTML, json: NobullfitWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Nobullfit.PubSub,
  live_view: [signing_salt: "jw+NDidg"]

# JavaScript bundling configuration
config :esbuild,
  version: "0.17.11",
  nobullfit: [
    args:
      ~w(js/app.js js/theme_init.js --bundle --target=es2022 --outdir=../priv/static/assets/js --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# CSS bundling configuration
config :tailwind,
  version: "4.0.9",
  nobullfit: [
    args: ~w(
      --input=assets/css/app.css
      --output=priv/static/assets/css/app.css
    ),
    cd: Path.expand("..", __DIR__)
  ]

# Logger configuration
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# JSON library for Phoenix
config :phoenix, :json_library, Jason

# Import environment-specific configuration
import_config "#{config_env()}.exs"
