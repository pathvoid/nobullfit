defmodule Nobullfit.Repo.Migrations.CreateLegalDocumentVersions do
  use Ecto.Migration

  def change do
    create table(:legal_document_versions) do
      add :document_type, :string, null: false # "privacy_policy" or "terms_of_service"
      add :version, :string, null: false # e.g., "2025-08-05"
      add :content_hash, :string, null: false # SHA256 hash of the content for change detection
      add :effective_date, :date, null: false
      add :is_active, :boolean, default: true, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:legal_document_versions, [:document_type, :version])
    create index(:legal_document_versions, [:document_type, :is_active])

    create table(:legal_document_notifications) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :document_type, :string, null: false
      add :version, :string, null: false
      add :notified_at, :utc_datetime, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:legal_document_notifications, [:user_id, :document_type, :version])
    create index(:legal_document_notifications, [:user_id])
    create index(:legal_document_notifications, [:document_type, :version])
  end
end
