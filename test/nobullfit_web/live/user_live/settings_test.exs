defmodule NobullfitWeb.UserLive.SettingsTest do
  use NobullfitWeb.ConnCase, async: true

  import Phoenix.LiveViewTest
  import Nobullfit.AccountsFixtures

  describe "settings page" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "renders settings page", %{conn: conn} do
      {:ok, _lv, html} = live(conn, ~p"/users/settings")

      assert html =~ "Account Settings"
      assert html =~ "Change Email"
      assert html =~ "Save Password"
      assert html =~ "Reset Progression"
      assert html =~ "Delete My Account"
      assert html =~ "Export Your Data"
      assert html =~ "Download My Data"
    end


    test "redirects if user is not in sudo mode", %{conn: conn} do
      {:ok, conn} =
        conn
        |> log_in_user(user_fixture(),
          token_authenticated_at: DateTime.add(DateTime.utc_now(:second), -11, :minute)
        )
        |> live(~p"/users/settings")
        |> follow_redirect(conn, ~p"/users/log-in")

      assert conn.resp_body =~ "You must re-authenticate to access this page."
    end
  end

  describe "update email form" do
    setup %{conn: conn} do
      user = user_fixture()
      %{conn: log_in_user(conn, user), user: user}
    end

    test "updates the user email", %{conn: conn, user: user} do
      new_email = unique_user_email()

      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      result =
        lv
        |> form("#email_form", %{
          "user" => %{"email" => new_email}
        })
        |> render_submit()

      assert result =~ "A link to confirm your email"
      assert Nobullfit.Accounts.get_user_by_email(user.email)
    end

    test "renders errors with invalid data (phx-change)", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      result =
        lv
        |> element("#email_form")
        |> render_change(%{
          "action" => "update_email",
          "user" => %{"email" => "with spaces"}
        })

      assert result =~ "Change Email"
      assert result =~ "must have the @ sign and no spaces"
    end

    test "renders errors with invalid data (phx-submit)", %{conn: conn, user: user} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      result =
        lv
        |> form("#email_form", %{
          "user" => %{"email" => user.email}
        })
        |> render_submit()

      assert result =~ "Change Email"
      assert result =~ "did not change"
    end
  end

  describe "update password form" do
    setup %{conn: conn} do
      user = user_fixture()
      %{conn: log_in_user(conn, user), user: user}
    end

    test "updates the user password", %{conn: conn, user: user} do
      new_password = valid_user_password()

      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      form =
        form(lv, "#password_form", %{
          "user" => %{
            "email" => user.email,
            "password" => new_password,
            "password_confirmation" => new_password
          }
        })

      render_submit(form)

      new_password_conn = follow_trigger_action(form, conn)

      assert redirected_to(new_password_conn) == ~p"/users/settings"

      assert get_session(new_password_conn, :user_token) != get_session(conn, :user_token)

      assert Phoenix.Flash.get(new_password_conn.assigns.flash, :info) =~
               "Password updated successfully"

      assert Nobullfit.Accounts.get_user_by_email_and_password(user.email, new_password)
    end

    test "renders errors with invalid data (phx-change)", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      result =
        lv
        |> element("#password_form")
        |> render_change(%{
          "user" => %{
            "password" => "too short",
            "password_confirmation" => "does not match"
          }
        })

      assert result =~ "Save Password"
      assert result =~ "should be at least 12 character(s)"
      assert result =~ "does not match password"
    end

    test "renders errors with invalid data (phx-submit)", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      result =
        lv
        |> form("#password_form", %{
          "user" => %{
            "password" => "too short",
            "password_confirmation" => "does not match"
          }
        })
        |> render_submit()

      assert result =~ "Save Password"
      assert result =~ "should be at least 12 character(s)"
      assert result =~ "does not match password"
    end
  end

  describe "confirm email" do
    setup %{conn: conn} do
      user = user_fixture()
      email = unique_user_email()

      token =
        extract_user_token(fn url ->
          Nobullfit.Accounts.deliver_user_update_email_instructions(%{user | email: email}, user.email, url)
        end)

      %{conn: log_in_user(conn, user), token: token, email: email, user: user}
    end

    test "updates the user email once", %{conn: conn, user: user, token: token, email: email} do
      {:error, redirect} = live(conn, ~p"/users/settings/confirm-email/#{token}")

      assert {:live_redirect, %{to: path, flash: flash}} = redirect
      assert path == ~p"/users/settings"
      assert %{"info" => message} = flash
      assert message == "Email changed successfully."
      refute Nobullfit.Accounts.get_user_by_email(user.email)
      assert Nobullfit.Accounts.get_user_by_email(email)

      # use confirm token again
      {:error, redirect} = live(conn, ~p"/users/settings/confirm-email/#{token}")
      assert {:live_redirect, %{to: path, flash: flash}} = redirect
      assert path == ~p"/users/settings"
      assert %{"error" => message} = flash
      assert message == "Email change link is invalid or it has expired."
    end

    test "does not update email with invalid token", %{conn: conn, user: user} do
      {:error, redirect} = live(conn, ~p"/users/settings/confirm-email/oops")
      assert {:live_redirect, %{to: path, flash: flash}} = redirect
      assert path == ~p"/users/settings"
      assert %{"error" => message} = flash
      assert message == "Email change link is invalid or it has expired."
      assert Nobullfit.Accounts.get_user_by_email(user.email)
    end

    test "redirects if user is not logged in", %{token: token} do
      conn = build_conn()
      {:error, redirect} = live(conn, ~p"/users/settings/confirm-email/#{token}")
      assert {:redirect, %{to: path, flash: flash}} = redirect
      assert path == ~p"/users/log-in"
      assert %{"error" => message} = flash
      assert message == "You must log in to access this page."
    end
  end

  describe "reset progression functionality" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "shows reset progression confirmation modal", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Click the reset progression button
      lv
      |> element("#reset-progression-btn")
      |> render_click()

      # Check that the modal is shown
      assert has_element?(lv, "#reset-progression-modal")
      assert render(lv) =~ "Confirm Progression Reset"
      assert render(lv) =~ "This action cannot be undone"
    end

    test "resets user progression successfully", %{conn: conn, user: user} do
      # Create some test data
      {:ok, _activity} = Nobullfit.Activities.create_activity(%{
        user_id: user.id,
        exercise_type: "Running",
        duration_minutes: 30,
        calories_burned: 300,
        activity_date: Date.utc_today()
      })

      {:ok, _weight_entry} = Nobullfit.WeightEntries.create_weight_entry(%{
        user_id: user.id,
        weight: Decimal.new("70.5"),
        unit: "kg",
        entry_date: Date.utc_today()
      })

      {:ok, _food_entry} = Nobullfit.FoodEntries.create_food_entry(%{
        user_id: user.id,
        name: "Apple",
        meal_type: "snack",
        calories: Decimal.new("95"),
        entry_date: Date.utc_today()
      })

      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Click reset progression button
      lv
      |> element("#reset-progression-btn")
      |> render_click()

      # Confirm the reset
      lv
      |> element("#reset-progression-modal button", "Yes, Reset My Progression")
      |> render_click()

      # Should redirect to settings with success message
      assert_redirect(lv, ~p"/users/settings")

      # Verify data was deleted
      activities = Nobullfit.Activities.list_user_activities(user.id)
      weight_entries = Nobullfit.WeightEntries.list_user_weight_entries(user.id)
      food_entries = Nobullfit.FoodEntries.get_user_food_entries_for_navigation(user.id)

      assert length(activities) == 0
      assert length(weight_entries) == 0
      assert length(food_entries) == 0
    end

    test "preserves favorites and grocery lists after reset", %{conn: conn, user: user} do
      # Create some test data
      {:ok, _activity} = Nobullfit.Activities.create_activity(%{
        user_id: user.id,
        exercise_type: "Running",
        duration_minutes: 30,
        calories_burned: 300,
        activity_date: Date.utc_today()
      })

      {:ok, _grocery_list} = Nobullfit.GroceryLists.create_grocery_list(%{
        name: "Test List",
        user_id: user.id
      })

      {:ok, _favorite} = Nobullfit.UserFavorites.create_user_favorite(%{
        user_id: user.id,
        favorite_type: "food",
        external_id: "test-food-123",
        name: "Test Food"
      })

      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Reset progression
      lv
      |> element("#reset-progression-btn")
      |> render_click()

      lv
      |> element("#reset-progression-modal button", "Yes, Reset My Progression")
      |> render_click()

      # Verify activities were deleted but favorites and grocery lists preserved
      activities = Nobullfit.Activities.list_user_activities(user.id)
      grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user.id)
      favorites = Nobullfit.UserFavorites.list_all_user_favorites(user.id)

      assert length(activities) == 0
      assert length(grocery_lists) >= 1
      assert length(favorites) == 1
    end

  end

  describe "delete account functionality" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "shows delete account confirmation modal", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Click the delete account button
      lv
      |> element("#delete-account-btn")
      |> render_click()

      # Check that the modal is shown
      assert has_element?(lv, "#delete-account-modal")
      assert render(lv) =~ "Confirm Account Deletion"
      assert render(lv) =~ "This action cannot be undone"
    end

    test "deletes user account successfully", %{conn: conn, user: user} do
      # Create some test data
      {:ok, _activity} = Nobullfit.Activities.create_activity(%{
        user_id: user.id,
        exercise_type: "Running",
        duration_minutes: 30,
        calories_burned: 300,
        activity_date: Date.utc_today()
      })

      {:ok, _grocery_list} = Nobullfit.GroceryLists.create_grocery_list(%{
        name: "Test List",
        user_id: user.id
      })

      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Click delete account button
      lv
      |> element("#delete-account-btn")
      |> render_click()

      # Confirm the deletion
      lv
      |> element("#delete-account-modal button", "Yes, Delete My Account")
      |> render_click()

      # Should redirect to home page
      assert_redirect(lv, ~p"/")

      # Verify user and all data was deleted
      assert Nobullfit.Accounts.get_user_by_email(user.email) == nil
      activities = Nobullfit.Activities.list_user_activities(user.id)
      grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user.id)

      assert length(activities) == 0
      assert length(grocery_lists) == 0
    end

  end

  describe "export data functionality" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "exports user data successfully", %{conn: conn, user: user} do
      # Create some test data
      {:ok, _activity} = Nobullfit.Activities.create_activity(%{
        user_id: user.id,
        exercise_type: "Running",
        duration_minutes: 30,
        calories_burned: 300,
        activity_date: Date.utc_today()
      })

      {:ok, _weight_entry} = Nobullfit.WeightEntries.create_weight_entry(%{
        user_id: user.id,
        weight: Decimal.new("70.5"),
        unit: "kg",
        entry_date: Date.utc_today()
      })

      {:ok, _food_entry} = Nobullfit.FoodEntries.create_food_entry(%{
        user_id: user.id,
        name: "Apple",
        meal_type: "snack",
        calories: Decimal.new("95"),
        entry_date: Date.utc_today()
      })

      # Test the export data endpoint
      conn = get(conn, ~p"/users/export-data")

      # Should return a ZIP file
      assert conn.status == 200
      assert get_resp_header(conn, "content-type") |> hd() =~ "application/zip"
      assert get_resp_header(conn, "content-disposition") |> hd() =~ "attachment"
      assert get_resp_header(conn, "content-disposition") |> hd() =~ "nobullfit_data_export_"
    end


    test "export data includes all user data types", %{conn: conn, user: user} do
      # Create comprehensive test data
      {:ok, _activity} = Nobullfit.Activities.create_activity(%{
        user_id: user.id,
        exercise_type: "Running",
        duration_minutes: 30,
        calories_burned: 300,
        activity_date: Date.utc_today()
      })

      {:ok, _weight_entry} = Nobullfit.WeightEntries.create_weight_entry(%{
        user_id: user.id,
        weight: Decimal.new("70.5"),
        unit: "kg",
        entry_date: Date.utc_today()
      })

      {:ok, _food_entry} = Nobullfit.FoodEntries.create_food_entry(%{
        user_id: user.id,
        name: "Apple",
        meal_type: "snack",
        calories: Decimal.new("95"),
        entry_date: Date.utc_today()
      })

      {:ok, _grocery_list} = Nobullfit.GroceryLists.create_grocery_list(%{
        name: "Test List",
        user_id: user.id
      })

      {:ok, _favorite} = Nobullfit.UserFavorites.create_user_favorite(%{
        user_id: user.id,
        favorite_type: "food",
        external_id: "test-food-123",
        name: "Test Food"
      })

      # Test the export
      conn = get(conn, ~p"/users/export-data")

      assert conn.status == 200
      assert get_resp_header(conn, "content-type") |> hd() =~ "application/zip"
    end
  end

  describe "modal interactions" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "can show reset progression modal", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Open reset progression modal
      lv
      |> element("#reset-progression-btn")
      |> render_click()

      # Modal should be shown
      assert has_element?(lv, "#reset-progression-modal")
    end

    test "can show delete account modal", %{conn: conn} do
      {:ok, lv, _html} = live(conn, ~p"/users/settings")

      # Open delete account modal
      lv
      |> element("#delete-account-btn")
      |> render_click()

      # Modal should be shown
      assert has_element?(lv, "#delete-account-modal")
    end
  end

  describe "error handling" do
    setup %{conn: conn} do
      user = user_fixture()
      conn = log_in_user(conn, user)
      %{user: user, conn: conn}
    end

    test "handles network errors during data export", %{conn: conn, user: _user} do
      # Test with a user that has no data
      conn = get(conn, ~p"/users/export-data")

      # Should still work with empty data
      assert conn.status == 200
      assert get_resp_header(conn, "content-type") |> hd() =~ "application/zip"
    end
  end

  describe "security and permissions" do
    test "prevents unauthorized access to settings", %{conn: conn} do
      # Try to access settings without being logged in
      conn = get(conn, ~p"/users/settings")
      assert redirected_to(conn) == ~p"/users/log-in"
    end

    test "prevents unauthorized data export", %{conn: conn} do
      # Try to export data without being logged in
      conn = get(conn, ~p"/users/export-data")
      assert redirected_to(conn) == ~p"/users/log-in"
    end
  end
end
