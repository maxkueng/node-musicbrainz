test: 
	@./node_modules/.bin/mocha \
        --ui bdd \
        --reporter spec \
        --timeout 5000

.PHONY: test
