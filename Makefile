test: 
	@./node_modules/.bin/mocha \
        --ui bdd \
        --reporter spec \
        --timeout 10000

.PHONY: test
