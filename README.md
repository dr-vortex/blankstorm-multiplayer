# Annihilation Multiplayer

This is a repository made for the development and testing of multiplayer for [Annihilation](https://annihilation.drvortex.dev).

## Testing

You can test the app [here](https://a.drvortex.dev/mp). You will have to connect before you send a ping or packet. Ping the server to see the amount of clients and the server status (always `online`). Some packets you can send:
- auth (data is your token): request authorization. Must be a valid token (if your logged in: click the lock in the top right -> cookies -> annihiltion.drvortex.dev -> token -> double click value -> copy + paste)
- get-clients: get the other connected clients. Requires authoization.
- get-log: get the server logs. Requires authorization and being a website moderator or above (a client in get-clients with an oplvl greater than 0)

At some point the server code may not be posted to this repo if and sensitive data (like database passwords) are added.

[Testing](https://a.drvortex.dev/mp)

[Discord](https://a.drvortex.dev/discord)
