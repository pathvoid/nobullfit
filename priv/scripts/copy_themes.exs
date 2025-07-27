#!/usr/bin/env elixir

# Script to copy themes.css to static assets
source_path = Path.join([File.cwd!(), "assets", "css", "themes.css"])
dest_path = Path.join([File.cwd!(), "priv", "static", "assets", "css", "themes.css"])

# Ensure the destination directory exists
dest_dir = Path.dirname(dest_path)
File.mkdir_p!(dest_dir)

# Copy the file
case File.copy(source_path, dest_path) do
  {:ok, _bytes} ->
    IO.puts("Successfully copied themes.css to #{dest_path}")
  {:error, reason} ->
    IO.puts("Failed to copy themes.css: #{reason}")
    System.halt(1)
end
