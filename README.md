# Annihilation Multiplayer

This is a repository made for the development and testing of multiplayer for [Annihilation](https://annihilation.drvortex.dev).

## Testing

You can test the app [here](https://a.drvortex.dev/mp). You will have to connect before you send a ping or packet. Ping the server to see the amount of clients and the server status (always `online`). Currently the only packets you can send are `get-clients` and `auth`, with data `test-password` and you token respectivly. This will be overhauled by requiring an `auth` packet to be sent prior to others, in which the server will check a passed token against the game's database to verify you are [logged](https://a.drvortex.dev/login) into a game account, and will require the user to have certain permissions before allowing certain packets (similar to Minecraft server operators). At some point the server code may not be posted to this repo if and sensitive data (like database passwords) are added. Also note that the `get-clients` response does not include real user data, except for the socket ID.

[Testing](https://a.drvortex.dev/mp)

[Discord](https://a.drvortex.dev/discord)
