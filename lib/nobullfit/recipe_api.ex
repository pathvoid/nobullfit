defmodule NoBullFit.RecipeAPI do
  @moduledoc """
    Module for interacting with the Edamam Recipe Search API.

    This module provides functions to search for recipes, get recipe details,
    and use various filtering options.
  """

  @base_url "https://api.edamam.com"
  @search_endpoint "/api/recipes/v2"
  @recipe_endpoint "/api/recipes/v2"

  # For development purposes
  @app_id "your_edamam_recipe_app_id_here"
  @app_key "your_edamam_recipe_app_key_here"

  @doc """
    Search for recipes using various criteria.

    ## Parameters
    - `opts` - Optional parameters including:
      - `app_id` - Your Edamam app ID (required)
      - `app_key` - Your Edamam app key (required)
      - `q` - Query text (e.g., "chicken")
      - `type` - Type of recipes (public, user, edamam-generic)
      - `diet` - Diet labels (balanced, high-fiber, high-protein, low-carb, low-fat, low-sodium)
      - `health` - Health labels (gluten-free, vegan, vegetarian, etc.)
      - `cuisineType` - Cuisine types (American, Italian, Mexican, etc.)
      - `mealType` - Meal types (Breakfast, Lunch, Dinner, Snack, Teatime)
      - `dishType` - Dish types (Main course, Side dish, Desserts, etc.)
      - `calories` - Calorie range (e.g., "100-300")
      - `time` - Time range in minutes (e.g., "30-60")
      - `ingr` - Number of ingredients range (e.g., "5-8")
      - `excluded` - Ingredients to exclude
      - `nutrients` - Map of nutrient filters
      - `random` - Boolean for random selection
      - `field` - Fields to include in response

    ## Examples
        iex> RecipeAPI.search_recipes(q: "chicken", app_id: "your_app_id", app_key: "your_app_key")
        iex> RecipeAPI.search_recipes(q: "pasta", cuisineType: ["Italian"], mealType: ["Dinner"])
        iex> RecipeAPI.search_recipes(q: "salad", health: ["vegan"], calories: "100-300")
  """
  def search_recipes(opts \\ []) do
    perform_search(opts)
  end

  # Private function to perform the actual API search
  defp perform_search(opts) do
    params = build_search_params(opts)
    url = "#{@base_url}#{@search_endpoint}"

    case HTTPoison.get(url, [], params: params) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} ->
            {:ok, data}

          {:error, _error} ->
            {:error, "Unable to process the recipe search results. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the recipe database. Please check your internet connection and try again."}
    end
  end

  @doc """
    Get a specific recipe by ID.

    ## Parameters
    - `recipe_id` - The recipe ID
    - `opts` - Optional parameters including:
      - `app_id` - Your Edamam app ID (required)
      - `app_key` - Your Edamam app key (required)
      - `type` - Recipe type (public, user, edamam-generic)
      - `field` - Fields to include in response

    ## Examples
        iex> RecipeAPI.get_recipe("recipe_id", app_id: "your_app_id", app_key: "your_app_key")
  """
  def get_recipe(recipe_id, opts \\ []) do
    {app_id, app_key} = get_credentials(opts)
    type = Keyword.get(opts, :type, "public")

    url = "#{@base_url}#{@recipe_endpoint}/#{recipe_id}?app_id=#{app_id}&app_key=#{app_key}&type=#{type}"

    case HTTPoison.get(url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} ->
            {:ok, data}

          {:error, _error} ->
            {:error, "Unable to process the recipe data. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the recipe database. Please check your internet connection and try again."}
    end
  end

  @doc """
    Get recipes by URI(s).

    ## Parameters
    - `uris` - List of recipe URIs (up to 20)
    - `opts` - Optional parameters including:
      - `app_id` - Your Edamam app ID (required)
      - `app_key` - Your Edamam app key (required)
      - `field` - Fields to include in response

    ## Examples
        iex> RecipeAPI.get_recipes_by_uri(["uri1", "uri2"], app_id: "your_app_id", app_key: "your_app_key")
  """
  def get_recipes_by_uri(uris, opts \\ []) do
    {app_id, app_key} = get_credentials(opts)

    params = [
      {"app_id", app_id},
      {"app_key", app_key}
    ]

    # Add URI parameters
    uri_params = Enum.map(uris, &{"uri", &1})
    params = params ++ uri_params

    url = "#{@base_url}#{@recipe_endpoint}/by-uri"

    case HTTPoison.get(url, [], params: params) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, data} ->
            {:ok, data}

          {:error, _error} ->
            {:error, "Unable to process the recipe data. Please try again."}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: _body}} ->
        {:error, format_api_error(status_code)}

      {:error, %HTTPoison.Error{reason: _reason}} ->
        {:error, "Unable to connect to the recipe database. Please check your internet connection and try again."}
    end
  end

  # Helper function to format API errors for user-friendly messages
  defp format_api_error(status_code) do
    case status_code do
      401 -> "Authentication failed. Please check your API credentials."
      403 -> "Access denied. Please check your API permissions."
      429 -> "Too many requests. Please wait a moment and try again."
      500 -> "The recipe database is temporarily unavailable. Please try again later."
      502 -> "The recipe database is temporarily unavailable. Please try again later."
      503 -> "The recipe database is temporarily unavailable. Please try again later."
      504 -> "The recipe database is temporarily unavailable. Please try again later."
      _ -> "Unable to search the recipe database at this time. Please try again later."
    end
  end

  # Helper function to get credentials from options or environment
  defp get_credentials(opts) do
    app_id = Keyword.get(opts, :app_id) || System.get_env("EDAMAM_RECIPE_APP_ID") || @app_id
    app_key = Keyword.get(opts, :app_key) || System.get_env("EDAMAM_RECIPE_APP_KEY") || @app_key

    if app_id == "your_edamam_recipe_app_id_here" or app_key == "your_edamam_recipe_app_key_here" do
      raise "Edamam credentials required. Please update @app_id and @app_key in the RecipeAPI module or set EDAMAM_RECIPE_APP_ID and EDAMAM_RECIPE_APP_KEY environment variables."
    end

    {app_id, app_key}
  end

  # Helper function to build search parameters
  defp build_search_params(opts) do
    {app_id, app_key} = get_credentials(opts)

    base_params = [
      {"app_id", app_id},
      {"app_key", app_key}
    ]

    # Add required type parameter
    type = Keyword.get(opts, :type, "public")
    params = [{"type", type} | base_params]

    # Add optional parameters
    params =
      if q = Keyword.get(opts, :q) do
        [{"q", q} | params]
      else
        params
      end

    params =
      if diet = Keyword.get(opts, :diet) do
        diet_params = Enum.map(diet, &{"diet", &1})
        diet_params ++ params
      else
        params
      end

    params =
      if health = Keyword.get(opts, :health) do
        health_params = Enum.map(health, &{"health", &1})
        health_params ++ params
      else
        params
      end

    params =
      if cuisine_type = Keyword.get(opts, :cuisineType) do
        cuisine_params = Enum.map(cuisine_type, &{"cuisineType", &1})
        cuisine_params ++ params
      else
        params
      end

    params =
      if meal_type = Keyword.get(opts, :mealType) do
        meal_params = Enum.map(meal_type, &{"mealType", &1})
        meal_params ++ params
      else
        params
      end

    params =
      if dish_type = Keyword.get(opts, :dishType) do
        dish_params = Enum.map(dish_type, &{"dishType", &1})
        dish_params ++ params
      else
        params
      end

    params =
      if calories = Keyword.get(opts, :calories) do
        [{"calories", calories} | params]
      else
        params
      end

    params =
      if time = Keyword.get(opts, :time) do
        [{"time", time} | params]
      else
        params
      end

    params =
      if ingr = Keyword.get(opts, :ingr) do
        [{"ingr", ingr} | params]
      else
        params
      end

    params =
      if excluded = Keyword.get(opts, :excluded) do
        excluded_params = Enum.map(excluded, &{"excluded", &1})
        excluded_params ++ params
      else
        params
      end

    params =
      if nutrients = Keyword.get(opts, :nutrients) do
        nutrient_params =
          Enum.map(nutrients, fn {key, value} ->
            {"nutrients[#{key}]", value}
          end)

        nutrient_params ++ params
      else
        params
      end

    params =
      if random = Keyword.get(opts, :random) do
        [{"random", random} | params]
      else
        params
      end

    params =
      if field = Keyword.get(opts, :field) do
        field_params = Enum.map(field, &{"field", &1})
        field_params ++ params
      else
        params
      end

    params
  end

  @doc """
    Convenience function to search for recipes and print results to console.

    ## Examples
        iex> RecipeAPI.search_and_print(q: "chicken")
        iex> RecipeAPI.search_and_print(q: "pasta", cuisineType: ["Italian"], mealType: ["Dinner"])
  """
  def search_and_print(opts \\ []) do
    case search_recipes(opts) do
      {:ok, data} ->
        IO.puts("\n=== Recipe Search Results ===")
        IO.puts("Found #{data["count"]} recipes")
        IO.puts("From: #{data["from"]} to #{data["to"]}")

        if data["hits"] do
          Enum.each(data["hits"], fn hit ->
            recipe = hit["recipe"]
            IO.puts("\n--- Recipe: #{recipe["label"]} ---")
            IO.puts("Source: #{recipe["source"]}")
            IO.puts("Calories: #{recipe["calories"]} kcal")
            IO.puts("Total Time: #{recipe["totalTime"]} minutes")
            IO.puts("Servings: #{recipe["yield"]}")

            if recipe["dietLabels"] && length(recipe["dietLabels"]) > 0 do
              IO.puts("Diet Labels: #{Enum.join(recipe["dietLabels"], ", ")}")
            end

            if recipe["healthLabels"] && length(recipe["healthLabels"]) > 0 do
              IO.puts("Health Labels: #{Enum.join(recipe["healthLabels"], ", ")}")
            end

            if recipe["cuisineType"] && length(recipe["cuisineType"]) > 0 do
              IO.puts("Cuisine: #{Enum.join(recipe["cuisineType"], ", ")}")
            end

            if recipe["mealType"] && length(recipe["mealType"]) > 0 do
              IO.puts("Meal Type: #{Enum.join(recipe["mealType"], ", ")}")
            end

            if recipe["dishType"] && length(recipe["dishType"]) > 0 do
              IO.puts("Dish Type: #{Enum.join(recipe["dishType"], ", ")}")
            end

            if recipe["ingredientLines"] && length(recipe["ingredientLines"]) > 0 do
              IO.puts("\nIngredients:")
              Enum.each(recipe["ingredientLines"], fn ingredient ->
                IO.puts("  - #{ingredient}")
              end)
            end

            if recipe["totalNutrients"] do
              IO.puts("\nKey Nutrients:")
              nutrients = recipe["totalNutrients"]

              key_nutrients = [
                {"ENERC_KCAL", "Calories"},
                {"PROCNT", "Protein"},
                {"CHOCDF", "Carbohydrates"},
                {"FAT", "Total Fat"},
                {"FIBTG", "Fiber"},
                {"SUGAR", "Sugars"},
                {"NA", "Sodium"}
              ]

              Enum.each(key_nutrients, fn {key, label} ->
                if nutrients[key] do
                  nutrient = nutrients[key]
                  IO.puts("  #{label}: #{nutrient["quantity"]}#{nutrient["unit"]}")
                end
              end)
            end

            IO.puts("URL: #{recipe["url"]}")
            IO.puts("Share URL: #{recipe["shareAs"]}")
          end)
        end

        {:ok, data}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end

  @doc """
    Convenience function to get a specific recipe and print details to console.

    ## Examples
        iex> RecipeAPI.get_recipe_and_print("recipe_id")
  """
  def get_recipe_and_print(recipe_id, opts \\ []) do
    case get_recipe(recipe_id, opts) do
      {:ok, data} ->
        recipe = data["recipe"]
        IO.puts("\n=== Recipe Details ===")
        IO.puts("Name: #{recipe["label"]}")
        IO.puts("Source: #{recipe["source"]}")
        IO.puts("Calories: #{recipe["calories"]} kcal")
        IO.puts("Total Time: #{recipe["totalTime"]} minutes")
        IO.puts("Servings: #{recipe["yield"]}")
        IO.puts("Total Weight: #{recipe["totalWeight"]}g")

        if recipe["dietLabels"] && length(recipe["dietLabels"]) > 0 do
          IO.puts("Diet Labels: #{Enum.join(recipe["dietLabels"], ", ")}")
        end

        if recipe["healthLabels"] && length(recipe["healthLabels"]) > 0 do
          IO.puts("Health Labels: #{Enum.join(recipe["healthLabels"], ", ")}")
        end

        if recipe["cuisineType"] && length(recipe["cuisineType"]) > 0 do
          IO.puts("Cuisine: #{Enum.join(recipe["cuisineType"], ", ")}")
        end

        if recipe["mealType"] && length(recipe["mealType"]) > 0 do
          IO.puts("Meal Type: #{Enum.join(recipe["mealType"], ", ")}")
        end

        if recipe["dishType"] && length(recipe["dishType"]) > 0 do
          IO.puts("Dish Type: #{Enum.join(recipe["dishType"], ", ")}")
        end

        if recipe["ingredientLines"] && length(recipe["ingredientLines"]) > 0 do
          IO.puts("\nIngredients:")
          Enum.each(recipe["ingredientLines"], fn ingredient ->
            IO.puts("  - #{ingredient}")
          end)
        end

        if recipe["totalNutrients"] do
          IO.puts("\nDetailed Nutrients:")
          nutrients = recipe["totalNutrients"]

          key_nutrients = [
            {"ENERC_KCAL", "Calories"},
            {"PROCNT", "Protein"},
            {"CHOCDF", "Carbohydrates"},
            {"FAT", "Total Fat"},
            {"FIBTG", "Fiber"},
            {"SUGAR", "Sugars"},
            {"NA", "Sodium"},
            {"CA", "Calcium"},
            {"FE", "Iron"},
            {"VITC", "Vitamin C"},
            {"VITD", "Vitamin D"}
          ]

          Enum.each(key_nutrients, fn {key, label} ->
            if nutrients[key] do
              nutrient = nutrients[key]
              IO.puts("  #{label}: #{nutrient["quantity"]}#{nutrient["unit"]}")
            end
          end)
        end

        IO.puts("URL: #{recipe["url"]}")
        IO.puts("Share URL: #{recipe["shareAs"]}")

        {:ok, data}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end

  @doc """
    Convenience function to get recipes by URI and print results to console.

    ## Examples
        iex> RecipeAPI.get_recipes_by_uri_and_print(["uri1", "uri2"])
  """
  def get_recipes_by_uri_and_print(uris, opts \\ []) do
    case get_recipes_by_uri(uris, opts) do
      {:ok, data} ->
        IO.puts("\n=== Recipes by URI ===")
        IO.puts("Found #{data["count"]} recipes")

        if data["hits"] do
          Enum.each(data["hits"], fn hit ->
            recipe = hit["recipe"]
            IO.puts("\n--- Recipe: #{recipe["label"]} ---")
            IO.puts("Source: #{recipe["source"]}")
            IO.puts("Calories: #{recipe["calories"]} kcal")
            IO.puts("Total Time: #{recipe["totalTime"]} minutes")
            IO.puts("Servings: #{recipe["yield"]}")

            if recipe["dietLabels"] && length(recipe["dietLabels"]) > 0 do
              IO.puts("Diet Labels: #{Enum.join(recipe["dietLabels"], ", ")}")
            end

            if recipe["healthLabels"] && length(recipe["healthLabels"]) > 0 do
              IO.puts("Health Labels: #{Enum.join(recipe["healthLabels"], ", ")}")
            end

            IO.puts("URL: #{recipe["url"]}")
          end)
        end

        {:ok, data}

      {:error, error} ->
        IO.puts("Error: #{error}")
        {:error, error}
    end
  end
end
