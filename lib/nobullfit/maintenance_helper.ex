defmodule Nobullfit.MaintenanceHelper do
  @moduledoc """
  Helper functions for managing maintenance mode.

  Usage examples:

  # Enable maintenance mode with default message
  Nobullfit.MaintenanceHelper.enable()

  # Enable maintenance mode with custom message
  Nobullfit.MaintenanceHelper.enable("Database migration in progress")

  # Enable maintenance mode with restrictions
  Nobullfit.MaintenanceHelper.enable("System upgrade", prevent_login: true, prevent_registration: true)

  # Disable maintenance mode
  Nobullfit.MaintenanceHelper.disable()

  # Check current status
  Nobullfit.MaintenanceHelper.status()
  """

  alias Nobullfit.MaintenanceSetting

  @doc """
  Enables maintenance mode with optional settings.

  ## Options
  - `message` - Custom maintenance message
  - `prevent_login` - Whether to prevent user login (default: false)
  - `prevent_registration` - Whether to prevent user registration (default: false)
  """
  def enable(message \\ nil, opts \\ []) do
    attrs = %{
      enabled: true,
      message: message,
      prevent_login: Keyword.get(opts, :prevent_login, false),
      prevent_registration: Keyword.get(opts, :prevent_registration, false)
    }

    case MaintenanceSetting.create(attrs) do
      {:ok, setting} ->
        {:ok, setting}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Disables maintenance mode.
  """
  def disable do
    case MaintenanceSetting.disable_maintenance() do
      {:ok, _setting} ->
        :ok

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Shows the current maintenance status.
  """
  def status do
    MaintenanceSetting.get_maintenance_status()
  end

  @doc """
  Gets the latest maintenance setting from the database.
  """
  def latest do
    MaintenanceSetting.get_latest()
  end
end
