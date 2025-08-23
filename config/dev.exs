import Config

# Development database configuration
config :nobullfit, Nobullfit.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "nobullfit_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# Development endpoint configuration with debugging enabled
config :nobullfit, NobullfitWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: String.to_integer(System.get_env("PORT") || "4000")],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "cERBLQelhBmvGI/dAOIPSgLBDht9DH5uTO3TgKgd8D6qq08qwxFYz+9MFTZpAeGf",
  watchers: [
    esbuild: {Esbuild, :install_and_run, [:nobullfit, ~w(--sourcemap=inline --watch)]},
    tailwind: {Tailwind, :install_and_run, [:nobullfit, ~w(--watch)]}
  ]

# Live reload configuration for development
config :nobullfit, NobullfitWeb.Endpoint,
  live_reload: [
    web_console_logger: true,
    patterns: [
      ~r"priv/static/(?!uploads/).*(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*(po)$",
      ~r"lib/nobullfit_web/(?:controllers|live|components|router)/?.*\.(ex|heex)$"
    ]
  ]

# Enable development routes
config :nobullfit, dev_routes: true

# Development logging configuration
config :logger, :default_formatter, format: "[$level] $message\n"

# Development stacktrace configuration
config :phoenix, :stacktrace_depth, 20

# Runtime plug initialization for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# Development LiveView configuration
config :phoenix_live_view,
  debug_heex_annotations: true,
  enable_expensive_runtime_checks: true

# Development websocket configuration for better connection stability
config :phoenix, :json_library, Jason

# Disable Swoosh API client for development
config :swoosh, :api_client, false

# Development mailer configuration - uses local adapter
config :nobullfit, Nobullfit.Mailer, adapter: Swoosh.Adapters.Local
