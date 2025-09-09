defmodule NobullfitWeb.Dashboard.ProgressLiveTest do
  use NobullfitWeb.ConnCase, async: true
  import Phoenix.LiveViewTest
  import Nobullfit.AccountsFixtures
  import Nobullfit.ActivitiesFixtures
  import Nobullfit.WeightEntriesFixtures

  setup %{conn: conn} do
    user = user_fixture()
    conn = log_in_user(conn, user)
    %{user: user, conn: conn}
  end

  describe "page rendering" do
    test "renders progress page with basic structure", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "Progress"
      assert html =~ "Track your daily progress"
      assert html =~ "Calories Burned"
      assert html =~ "Workout Time"
      assert html =~ "Exercises"
      assert html =~ "Active Days"
      assert html =~ "Current Weight"
    end

    test "shows empty state when no activities exist", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "No activities yet"
      assert html =~ "Add your first activity above to get started!"
    end

    test "displays daily summary statistics", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      # Check that all stat cards are present
      assert html =~ "Goal: 500"
      assert html =~ "Goal: 60 min"
      assert html =~ "Completed today"
      assert html =~ "This week"
    end
  end

  describe "activity functionality" do
    test "displays activities when they exist", %{conn: conn, user: user} do
      _activity = activity_fixture(user, %{
        exercise_type: "Running",
        duration_minutes: 45,
        calories_burned: 300
      })

      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "Running"
      assert html =~ "45 minutes"
      assert html =~ "300 cal"
    end

    test "adds new activity successfully", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Fill out the activity form
      view
      |> element("#activity-form")
      |> render_submit(%{
        "activity" => %{
          "exercise_type" => "Cardio",
          "duration_minutes" => "30",
          "calories_burned" => "150"
        }
      })

      # Check for success message
      html = render(view)
      assert html =~ "Activity added successfully!"
    end

    test "validates activity form fields", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with missing required fields
      view
      |> element("#activity-form")
      |> render_submit(%{
        "activity" => %{
          "exercise_type" => "",
          "duration_minutes" => "",
          "calories_burned" => ""
        }
      })

      # Check that form shows validation errors
      html = render(view)
      assert html =~ "can&#39;t be blank"
    end

    test "deletes activity successfully", %{conn: conn, user: user} do
      activity = activity_fixture(user, %{
        exercise_type: "Yoga",
        duration_minutes: 20,
        calories_burned: 100
      })

      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Click delete button (desktop version)
      view
      |> element(".hidden.md\\:flex button[phx-click='delete_activity'][phx-value-id='#{activity.id}']")
      |> render_click()

      # Check for success message
      html = render(view)
      assert html =~ "Activity deleted successfully!"
    end
  end

  describe "weight tracking functionality" do
    test "displays weight summary when weight exists", %{conn: conn, user: user} do
      _weight_entry = weight_entry_fixture(user, %{
        weight: Decimal.new("75.5"),
        unit: "kg"
      })

      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "75.5 kg"
    end

    test "shows no weight logged when no weight entries exist", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "No weight logged"
    end

    test "adds new weight entry successfully", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Fill out the weight form
      view
      |> element("#weight-form")
      |> render_submit(%{
        "weight_entry" => %{
          "weight" => "75.5",
          "unit" => "kg"
        }
      })

      # Check for success message
      html = render(view)
      assert html =~ "Weight logged successfully!"
    end

    test "validates weight form fields", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with missing required fields
      view
      |> element("#weight-form")
      |> render_submit(%{
        "weight_entry" => %{
          "weight" => "",
          "unit" => ""
        }
      })

      # Check that form shows validation errors
      html = render(view)
      assert html =~ "can&#39;t be blank"
    end
  end

  describe "date functionality" do
    test "handles date change", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Change date using the date picker
      yesterday = Date.utc_today() |> Date.add(-1) |> Date.to_string()

      view
      |> element("#main-container")
      |> render_hook("change_date", %{value: yesterday})

      # Check that the date was updated
      html = render(view)
      assert html =~ yesterday
    end

    test "handles invalid date format", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Try to change to invalid date
      view
      |> element("#main-container")
      |> render_hook("change_date", %{value: "invalid-date"})

      # Check for error message
      html = render(view)
      assert html =~ "Invalid date format"
    end

    test "prevents future date selection", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Try to select future date
      future_date = Date.utc_today() |> Date.add(1) |> Date.to_string()

      view
      |> element("#main-container")
      |> render_hook("change_date", %{value: future_date})

      # Check for error message
      html = render(view)
      assert html =~ "Cannot select future dates"
    end

    test "today button sets date to today", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Click today button (desktop version)
      view
      |> element(".hidden.md\\:flex button.btn.btn-sm.btn-info[phx-click='change_date']")
      |> render_click()

      # Check that date is set to today
      today = Date.utc_today() |> Date.to_string()
      html = render(view)
      assert html =~ today
    end
  end

  describe "weekly overview" do
    test "displays weekly overview with correct structure", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "Weekly Overview"
      assert html =~ "Your activity summary for the week"
      assert html =~ "Mon"
      assert html =~ "Tue"
      assert html =~ "Wed"
      assert html =~ "Thu"
      assert html =~ "Fri"
      assert html =~ "Sat"
      assert html =~ "Sun"
    end

    test "shows active days count in weekly overview", %{conn: conn, user: user} do
      # Create activities for different days
      _activity1 = activity_fixture(user, %{
        exercise_type: "Cardio",
        duration_minutes: 30,
        calories_burned: 150,
        activity_date: Date.utc_today()
      })

      _activity2 = activity_fixture(user, %{
        exercise_type: "Yoga",
        duration_minutes: 20,
        calories_burned: 100,
        activity_date: Date.utc_today() |> Date.add(-1)
      })

      {:ok, _view, html} = live(conn, ~p"/d/progress")

      # Should show at least 2 active days
      assert html =~ "2/7"
    end
  end

  describe "timezone data handling" do
    test "handles timezone data from client", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Send timezone data
      view
      |> element("#main-container")
      |> render_hook("timezone-data", %{
        "timezone" => "America/New_York",
        "localDate" => "2024-01-15"
      })

      # Check that the data was processed
      html = render(view)
      assert html =~ "2024-01-15"
    end
  end

  describe "authentication" do
    test "requires authentication" do
      conn = build_conn()
      assert {:error, {:redirect, %{to: "/users/log-in"}}} = live(conn, ~p"/d/progress")
    end
  end

  describe "form validation" do
    test "validates exercise type inclusion", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with invalid exercise type
      view
      |> element("#activity-form")
      |> render_submit(%{
        "activity" => %{
          "exercise_type" => "Invalid Type",
          "duration_minutes" => "30",
          "calories_burned" => "150"
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "is invalid"
    end

    test "validates duration minutes range", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with invalid duration
      view
      |> element("#activity-form")
      |> render_submit(%{
        "activity" => %{
          "exercise_type" => "Cardio",
          "duration_minutes" => "1500",  # More than 1440 minutes (24 hours)
          "calories_burned" => "150"
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "must be less than or equal to 1440"
    end

    test "validates weight range", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with invalid weight
      view
      |> element("#weight-form")
      |> render_submit(%{
        "weight_entry" => %{
          "weight" => "1500",  # More than 1000
          "unit" => "kg"
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "must be less than or equal to 1000"
    end

    test "validates weight unit inclusion", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/d/progress")

      # Submit form with invalid unit
      view
      |> element("#weight-form")
      |> render_submit(%{
        "weight_entry" => %{
          "weight" => "75.5",
          "unit" => "invalid_unit"
        }
      })

      # Check for validation error
      html = render(view)
      assert html =~ "is invalid"
    end
  end

  describe "exercise type icons" do
    test "displays correct icons for different exercise types", %{conn: conn, user: user} do
      # Create activities with different exercise types
      _cardio = activity_fixture(user, %{exercise_type: "Cardio"})
      _strength = activity_fixture(user, %{exercise_type: "Strength Training"})
      _yoga = activity_fixture(user, %{exercise_type: "Yoga"})

      {:ok, _view, html} = live(conn, ~p"/d/progress")

      # Check that icons are displayed
      assert html =~ "🏃‍♂️"  # Cardio/Running icon
      assert html =~ "💪"    # Strength Training icon
      assert html =~ "🧘‍♀️"  # Yoga icon
    end
  end

  describe "responsive design" do
    test "shows mobile date picker on mobile", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "mobile-date-picker"
      assert html =~ "md:hidden"
    end

    test "shows desktop date picker on desktop", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/d/progress")

      assert html =~ "desktop-date-picker"
      assert html =~ "hidden md:flex"
    end
  end
end
