.PHONY: gen-types

PROJECT_ID := hmpetrhaagqgtdgqickq
OUT := app/types/database.ts

gen-types:
	@mkdir -p $(dir $(OUT))
	@bunx supabase gen types typescript --project-id $(PROJECT_ID) --schema public > $(OUT)
	@echo "Generated $(OUT)"