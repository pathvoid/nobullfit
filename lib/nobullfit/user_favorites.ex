defmodule Nobullfit.UserFavorites do
  @moduledoc """
  The UserFavorites context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.UserFavorites.UserFavorite

  @doc """
  Returns the list of user favorites for a specific user and type.
  """
  def list_user_favorites(user_id, favorite_type) do
    UserFavorite
    |> where([f], f.user_id == ^user_id and f.favorite_type == ^favorite_type)
    |> order_by([f], [desc: f.inserted_at])
    |> Repo.all()
  end

  @doc """
  Returns the list of all user favorites for a specific user.
  """
  def list_all_user_favorites(user_id) do
    UserFavorite
    |> where([f], f.user_id == ^user_id)
    |> order_by([f], [desc: f.inserted_at])
    |> Repo.all()
  end

  @doc """
  Gets a single user favorite.
  """
  def get_user_favorite!(id, user_id) do
    UserFavorite
    |> where([f], f.id == ^id and f.user_id == ^user_id)
    |> Repo.one!()
  end

  @doc """
  Checks if a user has favorited a specific food or recipe.
  """
  def is_favorited?(user_id, favorite_type, external_id, name \\ nil) do
    query =
      UserFavorite
      |> where([f], f.user_id == ^user_id and f.favorite_type == ^favorite_type and f.external_id == ^external_id)

    query =
      if name do
        where(query, [f], f.name == ^name)
      else
        query
      end

    Repo.exists?(query)
  end

  @doc """
  Gets a user favorite by external ID and type.
  """
  def get_user_favorite_by_external_id(user_id, favorite_type, external_id, name \\ nil) do
    query =
      UserFavorite
      |> where([f], f.user_id == ^user_id and f.favorite_type == ^favorite_type and f.external_id == ^external_id)

    query =
      if name do
        where(query, [f], f.name == ^name)
      else
        query
      end

    Repo.one(query)
  end

  @doc """
  Creates a user favorite.
  """
  def create_user_favorite(attrs \\ %{}) do
    %UserFavorite{}
    |> UserFavorite.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a user favorite.
  """
  def update_user_favorite(%UserFavorite{} = user_favorite, attrs) do
    user_favorite
    |> UserFavorite.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a user favorite.
  """
  def delete_user_favorite(%UserFavorite{} = user_favorite) do
    Repo.delete(user_favorite)
  end

  @doc """
  Deletes a user favorite by external ID and type.
  """
  def delete_user_favorite_by_external_id(user_id, favorite_type, external_id, name \\ nil) do
    case get_user_favorite_by_external_id(user_id, favorite_type, external_id, name) do
      nil -> {:error, :not_found}
      favorite -> delete_user_favorite(favorite)
    end
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking user favorite changes.
  """
  def change_user_favorite(%UserFavorite{} = user_favorite, attrs \\ %{}) do
    UserFavorite.changeset(user_favorite, attrs)
  end

  @doc """
  Creates a food favorite from nutrition data.
  """
  def create_food_favorite(
        user_id,
        food_id,
        food_label,
        nutrition_data,
        measure_uri \\ "http://www.edamam.com/ontologies/edamam.owl#Measure_gram",
        quantity \\ 100,
        measures \\ []
      ) do
    # Extract nutrition values
    total_nutrients = nutrition_data["totalNutrients"] || %{}

    calories = get_calories_value(total_nutrients, "ENERC_KCAL")
    protein = get_nutrient_value(total_nutrients, "PROCNT")
    carbs = get_nutrient_value(total_nutrients, "CHOCDF")
    fat = get_nutrient_value(total_nutrients, "FAT")
    health_labels = nutrition_data["healthLabels"] || []
    serving_sizes = nutrition_data["servingSizes"] || []

    create_user_favorite(%{
      user_id: user_id,
      favorite_type: "food",
      external_id: food_id,
      name: food_label,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      health_labels: health_labels,
      measure_uri: measure_uri,
      quantity: quantity,
      serving_sizes: serving_sizes,
      measures: measures
    })
  end

  @doc """
  Creates a recipe favorite from recipe data.
  """
  def create_recipe_favorite(user_id, recipe_data) do
    recipe = recipe_data["recipe"]

    # Download and store the image if available
    image_data = download_image(recipe["image"])

    # Get the yield (number of servings) - default to 1 if not provided
    # Convert to integer since the database field is :integer
    yield =
      case recipe["yield"] do
        nil -> 1
        yield_value when is_number(yield_value) -> trunc(yield_value)
        _ -> 1
      end

    # Extract nutrition values from recipe data (these are for the entire recipe)
    total_nutrients = recipe["totalNutrients"] || %{}
    total_calories = recipe["calories"] || 0
    total_protein = get_nutrient_value(total_nutrients, "PROCNT")
    total_carbs = get_nutrient_value(total_nutrients, "CHOCDF")
    total_fat = get_nutrient_value(total_nutrients, "FAT")

    # Calculate per-serving nutrition values
    calories_per_serving = if yield > 0, do: trunc(total_calories / yield), else: total_calories
    protein_per_serving = if yield > 0 and total_protein, do: Decimal.div(total_protein, Decimal.new("#{yield}")), else: total_protein
    carbs_per_serving = if yield > 0 and total_carbs, do: Decimal.div(total_carbs, Decimal.new("#{yield}")), else: total_carbs
    fat_per_serving = if yield > 0 and total_fat, do: Decimal.div(total_fat, Decimal.new("#{yield}")), else: total_fat

    create_user_favorite(%{
      user_id: user_id,
      favorite_type: "recipe",
      external_id: recipe["uri"],
      name: recipe["label"],
      calories: calories_per_serving,
      protein: protein_per_serving,
      carbs: carbs_per_serving,
      fat: fat_per_serving,
      image_url: recipe["image"],
      external_url: recipe["url"],
      image_data: image_data[:data],
      image_content_type: image_data[:content_type],
      diet_labels: recipe["dietLabels"] || [],
      yield: yield,
      recipe_data: recipe_data
    })
  end

  # Helper function to extract calories value (as integer)
  defp get_calories_value(total_nutrients, nutrient_key) do
    case Map.get(total_nutrients, nutrient_key) do
      %{"quantity" => quantity} when is_number(quantity) ->
        trunc(quantity)

      _ ->
        nil
    end
  end

  # Helper function to extract nutrient values
  defp get_nutrient_value(total_nutrients, nutrient_key) do
    case Map.get(total_nutrients, nutrient_key) do
      %{"quantity" => quantity} when is_number(quantity) ->
        Decimal.new("#{quantity}")

      _ ->
        nil
    end
  end

  # Helper function to download and store image data
  defp download_image(nil), do: %{data: nil, content_type: nil}
  defp download_image(""), do: %{data: nil, content_type: nil}
  defp download_image(image_url) do
    try do
      case HTTPoison.get(image_url, [], timeout: 10_000, recv_timeout: 10_000) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body, headers: headers}} ->
          content_type = get_content_type(headers)
          %{data: body, content_type: content_type}

        _ ->
          %{data: nil, content_type: nil}
      end
    rescue
      _e ->
        %{data: nil, content_type: nil}
    end
  end

  # Helper function to extract content type from headers
  defp get_content_type(headers) do
    case Enum.find(headers, fn {key, _} -> String.downcase(key) == "content-type" end) do
      {_, content_type} -> content_type
      nil -> "image/jpeg" # Default fallback
    end
  end
end
