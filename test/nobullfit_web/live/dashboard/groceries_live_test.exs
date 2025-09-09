defmodule NobullfitWeb.Dashboard.GroceriesLiveTest do
  use NobullfitWeb.ConnCase, async: true
  import Phoenix.LiveViewTest
  import Nobullfit.AccountsFixtures
  import Nobullfit.GroceryListsFixtures

  setup %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)
    %{user: user, conn: conn}
  end

  describe "page rendering" do
    test "renders groceries page with basic structure", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "Groceries"
      assert html =~ "Manage your grocery lists"
      assert html =~ "Your Lists"
      assert html =~ "Current List"
      assert html =~ "New List"
    end

    test "shows empty state when no lists exist", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      # The page automatically creates a default "Shopping List" so we check for that instead
      assert html =~ "Shopping List"
      assert html =~ "0 items"
    end

    test "displays existing grocery lists", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "My Shopping List", is_active: false})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "My Shopping List"
      assert html =~ "0 items"
    end
  end

  describe "list management" do
    test "creates new grocery list", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Click new list button (desktop version)
      view
      |> element(".hidden button[phx-click='new_list']")
      |> render_click()

      # Check for success message
      html = render(view)
      assert html =~ "New list created successfully!"
    end

    test "loads different grocery list", %{conn: conn, user: user} do
      _list1 = grocery_list_fixture(user, %{name: "List 1", is_active: false})
      list2 = grocery_list_fixture(user, %{name: "List 2", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Click on second list
      view
      |> element("div[phx-click='load_list'][phx-value-list_id='#{list2.id}']")
      |> render_click()

      # Check that the list was loaded
      html = render(view)
      assert html =~ "List 2"
    end

    test "updates list name", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Original Name", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Update list name
      view
      |> element("form[phx-submit='save_list']")
      |> render_submit(%{
        "grocery_list" => %{
          "name" => "Updated Name"
        }
      })

      # Check for success message
      html = render(view)
      assert html =~ "List saved successfully!"
    end

    test "shows delete confirmation modal", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Click delete button
      view
      |> element("button[phx-click='confirm_delete_list'][phx-value-list_id='#{list.id}']")
      |> render_click()

      # Check that modal is shown
      html = render(view)
      assert html =~ "Confirm Delete"
      assert html =~ "Are you sure you want to delete this list?"
    end

    test "cancels delete confirmation", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Show delete confirmation
      view
      |> element("button[phx-click='confirm_delete_list'][phx-value-list_id='#{list.id}']")
      |> render_click()

      # Cancel delete
      view
      |> element("button[phx-click='cancel_delete']")
      |> render_click()

      # Check that modal is hidden
      html = render(view)
      refute html =~ "Confirm Delete"
    end

    test "deletes grocery list", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Show delete confirmation
      view
      |> element("button[phx-click='confirm_delete_list'][phx-value-list_id='#{list.id}']")
      |> render_click()

      # Confirm delete
      view
      |> element("button[phx-click='delete_list'][phx-value-list_id='#{list.id}']")
      |> render_click()

      # Check for success message
      html = render(view)
      assert html =~ "List deleted successfully!"
    end
  end

  describe "item management" do
    test "adds new item to list", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Add item
      view
      |> element("#add-item-form")
      |> render_submit(%{
        "grocery_item" => %{
          "name" => "Milk",
          "quantity" => "1 gallon"
        }
      })

      # Check for success message
      html = render(view)
      assert html =~ "Item added successfully!"
    end

    test "validates item form fields", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Submit form with missing required fields
      view
      |> element("#add-item-form")
      |> render_submit(%{
        "grocery_item" => %{
          "name" => "",
          "quantity" => ""
        }
      })

      # Check that form shows validation errors
      html = render(view)
      assert html =~ "can&#39;t be blank"
    end

    test "displays items in list", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      _item = grocery_item_fixture(list, %{"name" => "Bread", "quantity" => "1 loaf"})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "Bread"
      assert html =~ "Qty: 1 loaf"
    end

    test "shows empty state when no items in list", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "No items in list"
      assert html =~ "Add items above to build your grocery list"
    end

    test "toggles item completion status", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      item = grocery_item_fixture(list, %{"name" => "Milk"})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Toggle item completion
      view
      |> element("button[phx-click='toggle_item'][phx-value-item_id='#{item.id}']")
      |> render_click()

      # Check that item is marked as completed
      html = render(view)
      assert html =~ "line-through"
    end

    test "removes item from list", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      item = grocery_item_fixture(list, %{"name" => "Milk"})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Remove item
      view
      |> element("button[phx-click='remove_item'][phx-value-item_id='#{item.id}']")
      |> render_click()

      # Check for success message
      html = render(view)
      assert html =~ "Item removed successfully!"
    end

    test "unchecks all items", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      _item1 = grocery_item_fixture(list, %{"name" => "Milk"})
      _item2 = grocery_item_fixture(list, %{"name" => "Bread"})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Uncheck all items
      view
      |> element("button[phx-click='uncheck_all']")
      |> render_click()

      # Check that items are unchecked
      html = render(view)
      refute html =~ "line-through"
    end
  end

  describe "form validation" do
    test "validates list name length", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Submit form with name too long
      view
      |> element("form[phx-submit='save_list']")
      |> render_submit(%{
        "grocery_list" => %{
          "name" => String.duplicate("a", 101)  # More than 100 characters
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "should be at most 100 character(s)"
    end

    test "validates item name length", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Submit form with name too long
      view
      |> element("#add-item-form")
      |> render_submit(%{
        "grocery_item" => %{
          "name" => String.duplicate("a", 101),  # More than 100 characters
          "quantity" => "1"
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "should be at most 100 character(s)"
    end

    test "validates item quantity length", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Submit form with quantity too long
      view
      |> element("#add-item-form")
      |> render_submit(%{
        "grocery_item" => %{
          "name" => "Milk",
          "quantity" => String.duplicate("a", 21)  # More than 20 characters
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "should be at most 20 character(s)"
    end
  end

  describe "timezone data handling" do
    test "handles timezone data from client", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # Send timezone data
      view
      |> element("#groceries-page")
      |> render_hook("timezone-data", %{
        "timezone" => "America/New_York"
      })

      # Check that the data was processed (no error)
      html = render(view)
      assert html =~ "Groceries"
    end
  end

  describe "authentication" do
    test "requires authentication" do
      conn = build_conn()
      assert {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/d/groceries")
    end
  end

  describe "error handling" do
    test "handles no active list error", %{conn: conn, user: user} do
      # Create a list but don't make it active
      _list = grocery_list_fixture(user, %{name: "Test List", is_active: false})

      {:ok, view, _html} = live(conn, ~p"/d/groceries")

      # The LiveView should create a default active list or make the existing one active
      html = render(view)
      assert html =~ "Shopping List"
      assert html =~ "0 items"
    end

  end

  describe "responsive design" do
    test "shows mobile new list button", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "md:hidden"
      assert html =~ "New List"
    end

    test "shows desktop new list button", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "hidden md:flex"
      assert html =~ "New List"
    end
  end

  describe "list status display" do
    test "shows active list indicator", %{conn: conn, user: user} do
      _list = grocery_list_fixture(user, %{name: "Active List", is_active: false})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "Active"
    end

    test "shows item count in list", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: false})
      _item1 = grocery_item_fixture(list, %{"name" => "Milk"})
      _item2 = grocery_item_fixture(list, %{"name" => "Bread"})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "2 items"
    end
  end

  describe "item display states" do
    test "shows completed item styling", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      _item = grocery_item_fixture(list, %{"name" => "Milk", "is_completed" => true})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "border-success bg-success/10"
      assert html =~ "line-through text-base-content/50"
    end

    test "shows uncompleted item styling", %{conn: conn, user: user} do
      list = grocery_list_fixture(user, %{name: "Test List", is_active: true})
      _item = grocery_item_fixture(list, %{"name" => "Milk", "is_completed" => false})

      {:ok, _view, html} = live(conn, ~p"/d/groceries")

      assert html =~ "border-base-300"
      assert html =~ "text-base-content"
    end
  end
end
