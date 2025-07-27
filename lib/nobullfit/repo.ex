defmodule Nobullfit.Repo do
  @moduledoc """
  Database repository configuration using Ecto with PostgreSQL.
  """

  use Ecto.Repo,
    otp_app: :nobullfit,
    adapter: Ecto.Adapters.Postgres
end
