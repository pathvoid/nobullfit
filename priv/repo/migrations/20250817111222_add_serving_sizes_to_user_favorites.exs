defmodule Nobullfit.Repo.Migrations.AddServingSizesToUserFavorites do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      add :serving_sizes, :map
    end
  end
end
