defmodule Nobullfit.MaintenanceSetting do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Nobullfit.Repo

  schema "maintenance_settings" do
    field :enabled, :boolean, default: false
    field :message, :string
    field :prevent_login, :boolean, default: false
    field :prevent_registration, :boolean, default: false

    timestamps()
  end

  @doc false
  def changeset(maintenance_setting, attrs) do
    maintenance_setting
    |> cast(attrs, [:enabled, :message, :prevent_login, :prevent_registration])
    |> validate_required([:enabled])
    |> validate_length(:message, max: 1000)
  end

  @doc """
  Gets the latest maintenance setting from the database.
  Returns nil if no maintenance settings exist.
  """
  def get_latest do
    try do
      Repo.one(
        from ms in __MODULE__,
          order_by: [desc: ms.inserted_at],
          limit: 1
      )
    rescue
      _ -> nil
    end
  end

  @doc """
  Gets the current maintenance status.
  Returns a map with the maintenance information.
  """
  def get_maintenance_status do
    case get_latest() do
      nil ->
        %{
          enabled: false,
          message: nil,
          prevent_login: false,
          prevent_registration: false
        }

      setting ->
        %{
          enabled: setting.enabled,
          message: setting.message,
          prevent_login: setting.prevent_login,
          prevent_registration: setting.prevent_registration
        }
    end
  end

  @doc """
  Creates a new maintenance setting entry.
  """
  def create(attrs \\ %{}) do
    %__MODULE__{}
    |> changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an existing maintenance setting.
  """
  def update(%__MODULE__{} = maintenance_setting, attrs) do
    maintenance_setting
    |> changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Enables maintenance mode with optional settings.
  """
  def enable_maintenance(attrs \\ %{}) do
    create(Map.merge(%{enabled: true}, attrs))
  end

  @doc """
  Disables maintenance mode.
  """
  def disable_maintenance do
    create(%{enabled: false})
  end
end
