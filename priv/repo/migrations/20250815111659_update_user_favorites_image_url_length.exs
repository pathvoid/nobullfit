defmodule Nobullfit.Repo.Migrations.UpdateUserFavoritesImageUrlLength do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      modify :image_url, :text
      modify :external_url, :text
    end
  end
end
