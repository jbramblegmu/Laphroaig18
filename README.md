# CartoTweets

## Usage

1. Get the Node things:

    ```
    npm install mtwitter
    npm install cartodb
    npm install js-yaml
    ```

2. Get the authentication things. This means signing up for a CartoDB account and getting Twitter API credentials. Once you have those, create an `auth.yml` file in the base directory of this repository with the requisite information. It should look something like:

    ```
    user: [cartoDbUsername]
    password: [cartoDbPassword]
    api_key: [cartoDbApiKey]

    consumer_key: [twitterConsumerKey]
    consumer_secret: [twitterConsumerSecret]
    access_token_key: [twitterAccessTokenKey]
    access_token_secret: [twitterAccessTokenSecret]
    ```

3. Put some places in the `places` table of your CartoDB.

4. Run it: `node libs/CartoTweets.js`

# CartoDBupdateinsert

To be filled in...
