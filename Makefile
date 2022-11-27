dev:
	deno run --allow-read --allow-net src/dev.ts
.PHONY: dev

resource:
	deno run --allow-write src/scripts/resource.ts
.PHONY: resource

download:
	deno run --allow-write --allow-net src/scripts/scrape.ts
.PHONY: download

patch:
	deno run --allow-write src/scripts/patch.ts
.PHONY: patch

process:
	deno run --allow-write --allow-env --allow-net src/scripts/process.ts
.PHONY: process

missing:
	deno run --allow-write --allow-env --allow-net --allow-read src/scripts/process.ts missing
.PHONY: missing

html:
	deno run --allow-write --allow-read src/scripts/html.ts
.PHONY: html

scrape: download patch process html
.PHONY: scrape

clean:
	rm -f static/*.html
	rm -rf static/plugin
	rm -rf static/about
	rm -rf static/created
	rm -rf static/updated
.PHONY: clean

build: clean
	deno run --allow-write src/scripts/static.ts
.PHONY: build

upload:
	gsutil -m rm -r gs://neovimcraft.com/*
	gsutil -m -h 'Cache-Control:private, max-age=0, no-transform' rsync -r ./static gs://neovimcraft.com
	gsutil -m -h 'Cache-Control:private, max-age=0, no-transform' cp ./data/db.json gs://neovimcraft.com/db.json
.PHONY: upload

deploy: scrape build upload
.PHONY: deploy
