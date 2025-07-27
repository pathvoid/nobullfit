import Config

# Enable server when PHX_SERVER environment variable is set
if System.get_env("PHX_SERVER") do
  config :nobullfit, NobullfitWeb.Endpoint, server: true
end

# Production-specific runtime configuration
if config_env() == :prod do
  # Database configuration from environment variables
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :nobullfit, Nobullfit.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6

  # Secret key base for signing cookies and secrets
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"
  port = String.to_integer(System.get_env("PORT") || "4001")

  config :nobullfit, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  # Production endpoint configuration
  config :nobullfit, NobullfitWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    check_origin: ["//nobull.fit", "//www.nobull.fit", "//localhost"],
    http: [
      ip: {0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base,
    server: true
end
