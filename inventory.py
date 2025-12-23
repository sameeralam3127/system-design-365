#!/usr/bin/env python3
import json

inventory = {
  "web": {
    "hosts": ["10.0.0.10", "10.0.0.11"]
  },
  "db": {
    "hosts": ["10.0.0.20"]
  },
  "_meta": {
    "hostvars": {
      "10.0.0.10": {"ansible_user": "ubuntu"}
    }
  }
}

print(json.dumps(inventory))
