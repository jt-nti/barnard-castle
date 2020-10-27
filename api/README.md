[Vercel](https://vercel.com/) serverless API to publish venues to [MQTT](https://mqtt.org/)

Requires two environment variables to configure where to publish MQTT messages:

- `MQTT_SERVER`
- `MQTT_TOPIC`

Example request:

```
curl -w "%{http_code}" -H "Content-Type: application/json" -X POST "localhost:3000/api/venue" -d '{"qr":"UKC19TRACING:1:eyJhbGciOiJFUzI1NiIsImtpZCI6IllycWVMVHE4ei1vZkg1bnpsYVNHbllSZkI5YnU5eVBsV1lVXzJiNnFYT1EifQ.eyJpZCI6IjVZM1Y0Mk01Iiwib3BuIjoiQmFybmFyZCBDYXN0bGUiLCJ2dCI6IjAwMCIsInBjIjoiREwxMjhQUiJ9.gINSi7vSZ3hnYceo1BvKF2TLeQHcCpiYbBxn6MvljICKGEfamrT6E1anNpyJl7kAhV0QYO6pQEFsJvPUhE91Iw","lat":"54.55","lon":"1.92"}'
```
