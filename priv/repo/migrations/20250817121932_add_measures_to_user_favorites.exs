defmodule Nobullfit.Repo.Migrations.AddMeasuresToUserFavorites do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      add :measures, {:array, :map}
    end
  end
end
