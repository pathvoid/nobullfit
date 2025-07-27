defmodule NobullfitWeb.ConnCase do
  @moduledoc """
  Test case for tests requiring connection setup.

  Provides Phoenix.ConnTest functionality and database sandbox
  for connection-based tests. Database changes are reverted
  after each test.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      @endpoint NobullfitWeb.Endpoint

      use NobullfitWeb, :verified_routes

      import Plug.Conn
      import Phoenix.ConnTest
      import NobullfitWeb.ConnCase
    end
  end

  setup tags do
    Nobullfit.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end
end
