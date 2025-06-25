import { afterEach, describe, it, expect, mock } from "bun:test";
import { file } from "bun";
import { testOracleProgramExecution, testOracleProgramTally } from "@seda-protocol/dev-tools"
import { Buffer } from "buffer"; // Node.js Buffer for binary handling

// Note: This test file is designed for Bun.js and SEDA dev-tools environment.

const WASM_PATH = "target/wasm32-wasip1/release-wasm/oracle-program.wasm";

const fetchMock = mock();

afterEach(() => {
  fetchMock.mockRestore();
});

describe("data request execution", () => {
  it("should aggregate the results from the different APIs", async () => {
    fetchMock.mockImplementation((url) => {
      if (url.host === "earthquake.usgs.gov") {
        return new Response(JSON.stringify({
          features: [
            {
              properties: {
                mag: 5.5,
                place: "100km S of Testville",
                time: 1710000000000
              }
            }
          ]
        }));
      }
      return new Response('Unknown request');
    });

    const oracleProgram = await file(WASM_PATH).arrayBuffer();

    const vmResult = await testOracleProgramExecution(
      Buffer.from(oracleProgram),
      Buffer.from("unused-inputs"),
      fetchMock
    );

    expect(vmResult.exitCode).toBe(0);
    // Parse the result as JSON
    const eqInfo = JSON.parse(Buffer.from(vmResult.result).toString());
    expect(typeof eqInfo.magnitude).toBe("number");
    expect(typeof eqInfo.location).toBe("string");
    expect(typeof eqInfo.time).toBe("number");
    expect(eqInfo.magnitude).toBe(5.5);
    expect(eqInfo.location).toBe("100km S of Testville");
    expect(eqInfo.time).toBe(1710000000000);
  });

  it('should tally all results in a single data point', async () => {
    const oracleProgram = await file(WASM_PATH).arrayBuffer();

    // Prepare two reveals with different magnitudes
    const eq1 = { magnitude: 4.2, location: "Loc1", time: 1700000000000 };
    const eq2 = { magnitude: 6.1, location: "Loc2", time: 1700000001000 };
    const eq3 = { magnitude: 5.0, location: "Loc3", time: 1700000002000 };
    // Median is eq3 (5.0)
    const reveals = [eq1, eq2, eq3].map(eq => ({
      exitCode: 0,
      gasUsed: 0,
      inConsensus: true,
      result: Buffer.from(JSON.stringify(eq)),
    }));

    const vmResult = await testOracleProgramTally(Buffer.from(oracleProgram), Buffer.from('tally-inputs'), reveals);

    expect(vmResult.exitCode).toBe(0);
    const eqInfo = JSON.parse(Buffer.from(vmResult.result).toString());
    expect(eqInfo.magnitude).toBe(5.0);
    expect(eqInfo.location).toBe("Loc3");
    expect(eqInfo.time).toBe(1700000002000);
  });
});
