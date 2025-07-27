import Config

# Static asset caching configuration
config :nobullfit, NobullfitWeb.Endpoint, cache_static_manifest: "priv/static/cache_manifest.json"

# Production Swoosh API client configuration
config :swoosh, api_client: Swoosh.ApiClient.Req

# Disable Swoosh local memory storage in production
config :swoosh, local: false

# Production logging configuration
config :logger, level: :info
