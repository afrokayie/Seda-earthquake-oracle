use anyhow::Result;
use seda_sdk_rs::{elog, http_fetch, log, Process};
use serde::{Deserialize, Serialize};
use serde_json;

#[derive(Serialize, Deserialize, Debug)]
pub struct EarthquakeInfo {
    pub magnitude: f32,
    pub location: String,
    pub time: i64, // ms since epoch
}

#[derive(Deserialize, Debug)]
struct GeoJsonResponse {
    features: Vec<Feature>,
}

#[derive(Deserialize, Debug)]
struct Feature {
    properties: Properties,
}

#[derive(Deserialize, Debug)]
struct Properties {
    mag: Option<f32>,
    place: Option<String>,
    time: Option<i64>,
}

/**
 * Executes the data request phase within the SEDA network.
 * This phase is responsible for fetching non-deterministic data (e.g., earthquake info)
 * from an external source such as the USGS API.
 */
pub fn execution_phase() -> Result<()> {
    // Fetch the most recent earthquake event
    let url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1";
    log!("Fetching most recent earthquake from: {}", url);
    let response = http_fetch(url, None);

    if !response.is_ok() {
        elog!(
            "HTTP Response was rejected: {} - {}",
            response.status,
            String::from_utf8(response.bytes)?
        );
        Process::error("Error while fetching earthquake data".as_bytes());
        return Ok(());
    }

    let geojson: GeoJsonResponse = serde_json::from_slice(&response.bytes)?;
    let feature = geojson
        .features
        .get(0)
        .ok_or_else(|| anyhow::anyhow!("No earthquake data found"))?;
    let props = &feature.properties;

    let magnitude = props
        .mag
        .ok_or_else(|| anyhow::anyhow!("No magnitude in data"))?;
    let location = props
        .place
        .clone()
        .unwrap_or_else(|| "Unknown location".to_string());
    let time = props
        .time
        .ok_or_else(|| anyhow::anyhow!("No time in data"))?;

    log!(
        "Fetched earthquake: magnitude={}, location={}, time={}",
        magnitude,
        location,
        time
    );

    let eq_info = EarthquakeInfo {
        magnitude,
        location,
        time,
    };

    // Serialize the struct to bytes (as JSON for simplicity)
    let result_bytes = serde_json::to_vec(&eq_info)?;
    log!(
        "Reporting earthquake info as bytes: {} bytes",
        result_bytes.len()
    );
    Process::success(&result_bytes);
    Ok(())
}
