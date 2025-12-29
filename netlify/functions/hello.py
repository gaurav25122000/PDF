import requests

def handler(event, context):
    return {
        "statusCode": 200,
        "body": f"Hello from Netlify Functions! Requests version: {requests.__version__}"
    }
