defmodule Nobullfit.Repo.Migrations.AddYieldToUserFavorites do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      add :yield, :integer
    end
  end
end
