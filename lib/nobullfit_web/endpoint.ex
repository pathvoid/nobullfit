defmodule NobullfitWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :nobullfit

  # Session configuration for cookie storage and signing
  @session_options [
    store: :cookie,
    key: "_nobullfit_key",
    signing_salt: "cJzzn89C",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket,
    websocket: [
      connect_info: [session: @session_options],
      timeout: 120_000,
      max_frame_size: 16_777_216
    ],
    longpoll: [
      connect_info: [session: @session_options]
    ]

  # Static file serving from priv/static directory
  plug Plug.Static,
    at: "/",
    from: :nobullfit,
    gzip: not code_reloading?,
    only: NobullfitWeb.static_paths()

  # Development-only code reloading
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
    plug Phoenix.Ecto.CheckRepoStatus, otp_app: :nobullfit
  end

  plug Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  # Content Security Policy with manifest-src for Brave browser compatibility
  plug PlugContentSecurityPolicy

  plug NobullfitWeb.Router
end
