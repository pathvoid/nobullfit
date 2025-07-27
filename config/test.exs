import Config

# Test database configuration
config :nobullfit, Nobullfit.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "nobullfit_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# Test endpoint configuration - no server running
config :nobullfit, NobullfitWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "YN2lAZS6mwDa3v+OWvxSoJGlYCrexTqISIEIxpEtAb9M1pg2IHxNVtgaT3WhDMqV",
  server: false

# Test mailer configuration
config :nobullfit, Nobullfit.Mailer, adapter: Swoosh.Adapters.Test

# Disable Swoosh API client for tests
config :swoosh, :api_client, false

# Test logging configuration
config :logger, level: :warning

# Runtime plug initialization for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Enable expensive runtime checks for testing
config :phoenix_live_view,
  enable_expensive_runtime_checks: true
