defmodule Nobullfit.DataCase do
  @moduledoc """
  Test case for tests requiring data layer access.

  Provides Ecto functionality and database sandbox setup.
  Database changes are reverted after each test.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      alias Nobullfit.Repo

      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import Nobullfit.DataCase
    end
  end

  setup tags do
    Nobullfit.DataCase.setup_sandbox(tags)
    :ok
  end

  @doc """
  Sets up the database sandbox for testing.
  """
  def setup_sandbox(tags) do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Nobullfit.Repo, shared: not tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
  end

  @doc """
  Transforms changeset errors into a map of error messages.
  """
  def errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
      Regex.replace(~r"%{(\w+)}", message, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
