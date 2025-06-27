use crate::execution_phase::EarthquakeInfo;
use anyhow::Result;
use seda_sdk_rs::{elog, get_reveals, log, Process};
use serde_json;

/**
 * Executes the tally phase within the SEDA network.
 * This phase aggregates the results (e.g., earthquake data) revealed during the execution phase,
 * calculates the median magnitude, and submits the corresponding result.
 * Note: The number of reveals depends on the replication factor set in the data request parameters.
 */
pub fn tally_phase() -> Result<()> {
    // Retrieve consensus reveals from the tally phase.
    let reveals = get_reveals()?;
    let mut eqs: Vec<EarthquakeInfo> = Vec::new();

    // Iterate over each reveal, parse its content as EarthquakeInfo, and store it in the eqs array.
    for reveal in reveals {
        match serde_json::from_slice::<EarthquakeInfo>(&reveal.body.reveal) {
            Ok(eq) => {
                log!(
                    "Received earthquake: magnitude={}, location={}, time={}",
                    eq.magnitude,
                    eq.location,
                    eq.time
                );
                eqs.push(eq);
            }
            Err(_err) => {
                elog!("Reveal body could not be parsed as EarthquakeInfo");
                continue;
            }
        }
    }

    if eqs.is_empty() {
        // If no valid earthquakes were revealed, report an error indicating no consensus.
        Process::error("No consensus among revealed results".as_bytes());
        return Ok(());
    }

    // Sort by magnitude and pick the median entry
    eqs.sort_by(|a, b| {
        a.magnitude
            .partial_cmp(&b.magnitude)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let middle = eqs.len() / 2;
    let median_eq = if eqs.len() % 2 == 0 {
        // For even, pick the lower median
        &eqs[middle - 1]
    } else {
        &eqs[middle]
    };

    // Report the successful result in the tally phase, encoding the result as bytes (JSON)
    let result_bytes = serde_json::to_vec(median_eq)?;
    log!(
        "Reporting median earthquake info as bytes: {} bytes",
        result_bytes.len()
    );
    Process::success(&result_bytes);
    Ok(())
}
