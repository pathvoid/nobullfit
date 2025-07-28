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
        IO.puts("Maintenance mode enabled")
        IO.puts("Message: #{setting.message || "Default message"}")
        IO.puts("Prevent login: #{setting.prevent_login}")
        IO.puts("Prevent registration: #{setting.prevent_registration}")
        {:ok, setting}

      {:error, changeset} ->
        IO.puts("Failed to enable maintenance mode:")
        IO.inspect(changeset.errors)
        {:error, changeset}
    end
  end

  @doc """
  Disables maintenance mode.
  """
  def disable do
    case MaintenanceSetting.disable_maintenance() do
      {:ok, _setting} ->
        IO.puts("Maintenance mode disabled")
        :ok

      {:error, changeset} ->
        IO.puts("Failed to disable maintenance mode:")
        IO.inspect(changeset.errors)
        {:error, changeset}
    end
  end

  @doc """
  Shows the current maintenance status.
  """
  def status do
    status = MaintenanceSetting.get_maintenance_status()

    IO.puts("Maintenance Status:")
    IO.puts("Enabled: #{status.enabled}")
    IO.puts("Message: #{status.message || "Default message"}")
    IO.puts("Prevent login: #{status.prevent_login}")
    IO.puts("Prevent registration: #{status.prevent_registration}")

    status
  end

  @doc """
  Gets the latest maintenance setting from the database.
  """
  def latest do
    case MaintenanceSetting.get_latest() do
      nil ->
        IO.puts("No maintenance settings found in database")
        nil

      setting ->
        IO.puts("Latest maintenance setting:")
        IO.inspect(setting)
        setting
    end
  end
end
