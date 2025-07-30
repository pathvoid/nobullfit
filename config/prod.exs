import Config

# Static asset caching configuration
config :nobullfit, NobullfitWeb.Endpoint, cache_static_manifest: "priv/static/cache_manifest.json"

# Production Swoosh API client configuration
config :nobullfit, Nobullfit.Mailer,
  adapter: Swoosh.Adapters.AmazonSES,
  region: "us-east-1",
  access_key: System.get_env("AWS_ACCESS_KEY_ID"),
  secret: System.get_env("AWS_SECRET_ACCESS_KEY")

# Disable Swoosh local memory storage in production
config :swoosh, local: false

# Production logging configuration
config :logger, level: :info
