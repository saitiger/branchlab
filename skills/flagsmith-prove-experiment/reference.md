# CLI bodies

Use `flagsmith api` with `--input -` and the environment key already stored in `$ENV`. Do not echo `$ENV`.

Metric:

```json
{"name":"<metric name>","aggregation":"mean","direction":"up","definition":{"version":1,"event":"<event name>"}}
```

`aggregation` is `occurrence`, `count`, `sum`, or `mean`. `direction` is `up` or `down`. The event string is case-sensitive.

POST `api/v1/environments/$ENV/experiment-metrics/`.

Experiment, created and not started:

```json
{
  "feature": 0,
  "name": "<experiment name>",
  "hypothesis": "<one sentence>",
  "metrics": [{"metric": 0, "expected_direction": "increase"}],
  "experiment_rollout": {
    "enabled": true,
    "rollout_percentage": 100,
    "feature_state_value": {"type": "string", "value": "<control value>"},
    "multivariate_feature_state_values": [
      {"multivariate_feature_option": 0, "percentage_allocation": 50}
    ]
  }
}
```

`feature` and `metric` are numeric ids from the create responses. `expected_direction` is `increase` or `decrease`. Each treatment option gets a `percentage_allocation`. Control receives the remainder, so the allocations must sum to 100 with that remainder included in how Flagsmith assigns control. Set the treatment allocation to half of the rollout when the split is even and there is one treatment.

POST `api/v1/environments/$ENV/experiments/`.

Later calls, each with body `{}` unless the error says otherwise:

- `POST api/v1/environments/$ENV/experiments/<id>/start/`
- `POST api/v1/environments/$ENV/experiments/<id>/results/refresh/`
- `GET api/v1/environments/$ENV/experiments/<id>/results/`
- `POST api/v1/environments/$ENV/experiments/<id>/complete/`

If a POST rejects `{}`, stop and show the error. Do not invent fields.

jq filters to prefer:

- Feature: `{enabled:.enabled,keys:[.multivariate_options[]?.key]}`
- Metric: `{id:.id,event:.definition.event}`
- Experiment: `{id:.id,name:.name,status:.status,rollout:.experiment_rollout.rollout_percentage}`
