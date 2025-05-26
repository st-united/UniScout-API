TTLX_TC_BE_DEV_REPO:= 902637028063.dkr.ecr.ap-southeast-1.amazonaws.com/aicp-tc-be:0.0.24

build:
	docker compose up -d --build

up:
	docker compose up -d

up-clean:
	docker compose up -d --build --force-recreate --remove-orphans

stop:
	docker compose stop

down:
	docker compose down

exec:
	docker compose exec backend sh

seed:
	docker compose exec backend npm run seed

build-dist:
	docker compose exec backend npm run build exit

format:
	docker compose exec backend npm run format

nest-resource:
	nest g resource /modules/$(name)

build-pro:
	docker build \
		--platform linux/x86_64 \
		-f docker/Dockerfile.product \
		-t $(TTLX_TC_BE_DEV_REPO) \
		.; \
		docker push $(TTLX_TC_BE_DEV_REPO);

login:
	aws ecr get-login-password \
    --region ap-southeast-1 \
	| docker login \
    --username AWS \
    --password-stdin 902637028063.dkr.ecr.ap-southeast-1.amazonaws.com

run:
	docker run \
		--detach \
		--name ttlxbe-test \
		--env-file .env \
		-p 6002:6002 \
		ttlxbe:latest

map-db:
	kubectl -n aicp-tc-dev port-forward pod/aicp-tc-dev-db-deployment-0 5432:5432
