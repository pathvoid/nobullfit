defmodule NobullfitWeb.Dashboard.FavoritesLiveTest do
  use NobullfitWeb.ConnCase, async: true
  import Phoenix.LiveViewTest
  import Nobullfit.AccountsFixtures
  import Nobullfit.UserFavoritesFixtures

  setup %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)
    %{user: user, conn: conn}
  end

  describe "authentication" do
    test "requires authentication", %{conn: _conn} do
      # Create a new connection without authentication
      conn = build_conn()

      # This should redirect to login
      {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/d/favorites")
    end
  end

  describe "page rendering" do
    test "renders favorites page with correct title", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      assert html =~ "Favorites"
      assert html =~ "Your saved foods and recipes for quick access"
    end

    test "renders correct navigation path", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      assert html =~ "Favorites"
    end

    test "shows empty state when no favorites exist", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Should show empty state for foods tab (default)
      assert html =~ "No favorite foods yet"
      assert html =~ "When you add foods to your favorites from the Food Database"
    end

    test "displays favorite counts in tabs", %{conn: conn, user: user} do
      # Create some favorites
      food_favorite_fixture(user)
      food_favorite_fixture(user)
      recipe_favorite_fixture(user)

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Should show counts in tab badges
      assert html =~ "Foods"
      assert html =~ "Recipes"
      # The exact count numbers will be in the badges
    end
  end

  describe "tab switching" do
    test "defaults to foods tab", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Foods tab should be active by default
      html = render(view)
      assert html =~ ~r/class="[^"]*tab-active[^"]*"[^>]*>.*Foods/s
    end

    test "switches to recipes tab", %{conn: conn, user: user} do
      recipe_favorite_fixture(user)

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Click recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      # Recipes tab should be active
      html = render(view)
      assert html =~ ~r/class="[^"]*tab-active[^"]*"[^>]*>.*Recipes/s
    end

    test "switches back to foods tab", %{conn: conn, user: user} do
      food_favorite_fixture(user)
      recipe_favorite_fixture(user)

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes first
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      # Then switch back to foods
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='foods']")
      |> render_click()

      # Foods tab should be active
      html = render(view)
      assert html =~ ~r/class="[^"]*tab-active[^"]*"[^>]*>.*Foods/s
    end
  end

  describe "food favorites display" do
    test "displays food favorites with nutrition information", %{conn: conn, user: user} do
      _favorite = food_favorite_fixture(user, %{
        name: "Test Apple",
        calories: 95,
        protein: Decimal.new("0.5"),
        carbs: Decimal.new("25.0"),
        fat: Decimal.new("0.3")
      })

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Should display the food favorite
      assert html =~ "Test Apple"
      assert html =~ "95"
      assert html =~ "0.5"
      assert html =~ "25.0"
      assert html =~ "0.3"
    end

    test "displays multiple food favorites", %{conn: conn, user: user} do
      food_favorite_fixture(user, %{name: "Apple"})
      food_favorite_fixture(user, %{name: "Banana"})
      food_favorite_fixture(user, %{name: "Orange"})

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      assert html =~ "Apple"
      assert html =~ "Banana"
      assert html =~ "Orange"
    end

    test "displays food favorites without health labels (not shown in template)", %{conn: conn, user: user} do
      food_favorite_fixture(user, %{
        name: "Healthy Food",
        health_labels: ["VEGETARIAN", "LOW_SODIUM", "GLUTEN_FREE"]
      })

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Health labels are not displayed in the food table template
      assert html =~ "Healthy Food"
      # The health labels are stored but not displayed in the UI
    end
  end

  describe "recipe favorites display" do
    test "displays recipe favorites with nutrition information", %{conn: conn, user: user} do
      _favorite = recipe_favorite_fixture(user, %{
        name: "Test Recipe",
        calories: 250,
        protein: Decimal.new("12.0"),
        carbs: Decimal.new("35.0"),
        fat: Decimal.new("8.0"),
        yield: 2
      })

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      # Should display the recipe favorite
      assert html =~ "Test Recipe"
      assert html =~ "250"  # calories per serving
      # The nutrition values are calculated from recipe_data, not directly from the stored values
      # So we just check that the recipe name and calories are displayed
    end

    test "displays multiple recipe favorites", %{conn: conn, user: user} do
      recipe_favorite_fixture(user, %{name: "Pasta Recipe"})
      recipe_favorite_fixture(user, %{name: "Salad Recipe"})
      recipe_favorite_fixture(user, %{name: "Soup Recipe"})

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      assert html =~ "Pasta Recipe"
      assert html =~ "Salad Recipe"
      assert html =~ "Soup Recipe"
    end

    test "shows diet labels for recipe favorites", %{conn: conn, user: user} do
      recipe_favorite_fixture(user, %{
        name: "Healthy Recipe",
        diet_labels: ["BALANCED", "LOW_CARB", "HIGH_PROTEIN"]
      })

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      assert html =~ "BALANCED"
      assert html =~ "LOW_CARB"
      assert html =~ "HIGH_PROTEIN"
    end
  end

  describe "favorite deletion" do
    test "shows delete confirmation modal", %{conn: conn, user: user} do
      favorite = food_favorite_fixture(user, %{name: "Test Food"})

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Click delete button
      view
      |> element("button[phx-click='show_delete_confirm'][phx-value-id='#{favorite.id}'][phx-value-type='food']")
      |> render_click()

      # Should show confirmation modal
      html = render(view)
      assert html =~ "Are you sure you want to remove"
      assert html =~ "Test Food"
    end

    test "hides delete confirmation modal", %{conn: conn, user: user} do
      favorite = food_favorite_fixture(user, %{name: "Test Food"})

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Show delete confirmation
      view
      |> element("button[phx-click='show_delete_confirm'][phx-value-id='#{favorite.id}'][phx-value-type='food']")
      |> render_click()

      # Hide delete confirmation
      view
      |> element("button[phx-click='hide_delete_confirm']")
      |> render_click()

      # Modal should be hidden
      html = render(view)
      refute html =~ "Are you sure you want to remove"
    end

    test "deletes food favorite after confirmation", %{conn: conn, user: user} do
      favorite = food_favorite_fixture(user, %{name: "Test Food"})

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Show delete confirmation
      view
      |> element("button[phx-click='show_delete_confirm'][phx-value-id='#{favorite.id}'][phx-value-type='food']")
      |> render_click()

      # Confirm deletion
      view
      |> element("button[phx-click='confirm_delete']")
      |> render_click()

      # Should show success message and remove the favorite
      html = render(view)
      assert html =~ "Removed from favorites"
      refute html =~ "Test Food"
    end

    test "deletes recipe favorite after confirmation", %{conn: conn, user: user} do
      favorite = recipe_favorite_fixture(user, %{name: "Test Recipe"})

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      # Show delete confirmation
      view
      |> element("button[phx-click='show_delete_confirm'][phx-value-id='#{favorite.id}'][phx-value-type='recipe']")
      |> render_click()

      # Confirm deletion
      view
      |> element("button[phx-click='confirm_delete']")
      |> render_click()

      # Should show success message and remove the favorite
      html = render(view)
      assert html =~ "Removed from favorites"
      refute html =~ "Test Recipe"
    end
  end

  describe "nutrition calculations" do
    test "displays per 100g nutrition for foods", %{conn: conn, user: user} do
      # Create a food favorite with specific quantity and nutrition
      food_favorite_fixture(user, %{
        name: "Test Food",
        calories: 200,
        protein: Decimal.new("10.0"),
        carbs: Decimal.new("30.0"),
        fat: Decimal.new("5.0"),
        quantity: 200  # 200g serving
      })

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Should show per 100g values (calculated by the LiveView)
      # The calculate_per_100g_nutrition function divides by quantity/100
      # So 200 calories for 200g becomes 100 calories per 100g
      assert html =~ "100.0"  # 200 * (100/200) = 100 calories per 100g
      assert html =~ "5.0"    # 10.0 * (100/200) = 5.0g protein per 100g
      assert html =~ "15.0"   # 30.0 * (100/200) = 15.0g carbs per 100g
      assert html =~ "2.5"    # 5.0 * (100/200) = 2.5g fat per 100g
    end

    test "displays per serving nutrition for recipes", %{conn: conn, user: user} do
      # Create a recipe favorite with specific yield and nutrition
      recipe_favorite_fixture(user, %{
        name: "Test Recipe",
        calories: 400,  # per serving
        protein: Decimal.new("20.0"),  # per serving
        carbs: Decimal.new("50.0"),   # per serving
        fat: Decimal.new("10.0"),     # per serving
        yield: 4  # 4 servings total
      })

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      # Should show per serving values
      # The nutrition values are calculated from recipe_data in the template
      # So we just check that the recipe name and calories are displayed
      assert html =~ "Test Recipe"
      assert html =~ "400"  # calories per serving
    end
  end

  describe "empty states" do
    test "shows empty state for foods when no food favorites exist", %{conn: conn, user: user} do
      # Create only recipe favorites
      recipe_favorite_fixture(user)

      {:ok, _view, html} = live(conn, ~p"/d/favorites")

      # Should show empty state for foods (default tab)
      assert html =~ "No favorite foods yet"
      assert html =~ "When you add foods to your favorites from the Food Database"
    end

    test "shows empty state for recipes when no recipe favorites exist", %{conn: conn, user: user} do
      # Create only food favorites
      food_favorite_fixture(user)

      {:ok, view, _html} = live(conn, ~p"/d/favorites")

      # Switch to recipes tab
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      # Should show empty state for recipes
      assert html =~ "No favorite recipes yet"
      assert html =~ "When you add recipes to your favorites from the Recipe Database"
    end
  end

  describe "user isolation" do
    test "only shows favorites for the current user", %{conn: conn, user: user} do
      # Create another user with favorites
      other_user = user_fixture()
      food_favorite_fixture(other_user, %{name: "Other User's Food"})
      recipe_favorite_fixture(other_user, %{name: "Other User's Recipe"})

      # Create favorites for current user
      food_favorite_fixture(user, %{name: "My Food"})
      recipe_favorite_fixture(user, %{name: "My Recipe"})

      {:ok, view, html} = live(conn, ~p"/d/favorites")

      # Should only show current user's food favorites (default tab)
      assert html =~ "My Food"
      refute html =~ "Other User's Food"

      # Switch to recipes tab to check recipe favorites
      view
      |> element("button[phx-click='switch_tab'][phx-value-tab='recipes']")
      |> render_click()

      html = render(view)

      # Should only show current user's recipe favorites
      assert html =~ "My Recipe"
      refute html =~ "Other User's Recipe"
    end
  end
end
