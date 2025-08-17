defmodule Nobullfit.Repo.Migrations.AddRecipeDataToUserFavorites do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      add :recipe_data, :map
    end
  end
end
