# Custom Rooibos V5 - CI Support
___
## Overview

RooibosV5 still doesn't have a means of integrating with CI via a socket. This custom build exposes the Rooibos test result data allowing it to be sent to any listeners e.g. port 20002.

## How to Use

1. Add the following module to your `package.json` and run `npm install`,
    `"@sky-uk/rooibos-custom": "1.0.0",`
2. Create a test Main.brs for running Rooibos V5 tests with the following,

(Test)Main.brs
```
sub main() ' bs:disable-line:1003
    port = CreateObject("roAppInfo").getValue("rooibos_port")
    if port <> "" then _waitOnSocket(port.toInt())

    if type(Rooibos_init) = "Function" then Rooibos_init()

    if m.connection <> invalid then m.connection.sendStr(formatJSON(_buildReport(GetGlobalAA().scene.rooibosTestResult)))
end sub

' CI Socket Integration

sub _waitOnSocket(port as Integer)
    messagePort = CreateObject("roMessagePort")
    m.socket = CreateObject("roStreamSocket")
    m.socket.setMessagePort(messagePort)
    addr = CreateObject("roSocketAddress")
    addr.setPort(port)
    m.socket.setAddress(addr)
    m.socket.notifyReadable(true)
    x = m.socket.listen(1)

    if NOT m.socket.eOK()
        ? "[ROOIBOS-V5]: Could not create socket."
        return
    end if

    ? "[ROOIBOS-V5]: Waiting for CI socket connection on port:" port

    while true
        msg = wait(0, messagePort)
        if type(msg) = "roSocketEvent"
            if m.socket.isReadable()
                newConnection = m.socket.accept()
                if newConnection = invalid
                    ? "[ROOIBOS-V5]: Socket connection failed"
                else
                    ? substitute("[ROOIBOS-V5]:{0} connected! Running tests...", str(port))
                    m.connection = newConnection
                    return
                end if
            else
                if newConnection <> invalid AND NOT newConnection.eOK()
                    ? "[ROOIBOS-V5]: Closing connection on port:" port
                    newConnection.close()
                end if
            end if
        end if
    end while
end sub

function _buildReport(result as Object) as Object
    report = {}
    report["success"] = NOT result.stats.hasFailures
    report["totalTestCount"] = result.stats.ranCount
    report["failedTestCount"] = result.stats.failedCount
    report["tests"] = []

    for each testSuite in result.testSuites
        for each group in testSuite.groups
            for each test in group.tests
                testResult = {}
                testResult["isFail"] = test.result.isFail
                testResult["name"] = test.name
                testResult["message"] = test.result.message
                testResult["filePath"] = substitute("file://{0}:{1}", testSuite.filePath.trim(), stri(test.lineNumber).trim())
                report.tests.push(testResult)
            end for
        end for
    end for

    return report
end function
```

3. Create Gulp build step to connect to the unit test build and parse the test results,

```
var net = require('net');
var fs = require('fs');

module.exports = function (gulp, plugins) {
    return cb => {
        const ROKU_DEV_TARGET = process.env.ROKU_DEV_TARGET;
        const RETRY_DELAY = 500;
        const socket = net.Socket();

        let remainingConnectionAttempts = 5;

        getResults()
            .then(parseResults)
            .then(saveResults)
            .then(results => {
                if (results.success) {
                    console.log('Tests passed! \n')
                } else {
                    console.log(`\n ${results.failedTestCount} ${results.failedTestCount > 1 ? 'Tests' : 'Test'} failed!  \n`);
                }
                cb();
            })
            .catch(err => {
                console.log(`\n Error: ${err} \n`);
                cb(err);
            });

        function getResults() {
            return new Promise((fulfil, reject) => {
                let dataStr = '';

                socket.setEncoding('utf8');
                socket.setKeepAlive(false);
                socket.setTimeout(180000, () => {
                    socket.end();
                });

                connect();

                socket.on('connect', () => {
                    console.log(`\n Connected to ${ROKU_DEV_TARGET} \n`);
                });

                socket.on('data', data => {
                    dataStr = dataStr + data;
                });

                socket.on('error', err => {
                    errorMessage = `Unable to get response from box ${ROKU_DEV_TARGET}: ${err}`;
                    remainingConnectionAttempts--;

                    if (remainingConnectionAttempts < 0) {
                        reject(errorMessage);
                        return;
                    }

                    console.log(errorMessage);
                    console.log(`Retrying connection in ${RETRY_DELAY}ms. Remaining attempts: ${remainingConnectionAttempts}`)
                    setTimeout(connect, RETRY_DELAY);
                });

                socket.on('end', () => {
                    console.log('Closing Socket!');
                    fulfil(dataStr);
                    console.log(`\n Disconnected from ${ROKU_DEV_TARGET} \n `);
                });
            });
        }

        function parseResults(resultStream) {
            return new Promise((fulfil, reject) => {
                rooibosResult = JSON.parse(resultStream);

                let xml = `
                <testsuites>
                    <testsuite name="Rooibos" tests="${rooibosResult.totalTestCount}" failures="${rooibosResult.failedTestCount}">\n`;

                rooibosResult.tests.forEach((test, index, tests) => {
                    if (!test.isFail) {
                        xml += `
                        <testcase name="Passed Test ${index}" classname="${test.name}"/>`
                    } else {
                        xml += `
                        <testcase name="${test.name}" classname="${test.filePath}-FAIL">
                            <failure message="${test.message}"/>
                        </testcase>`
                    }
                    xml += '\n';
                });

                xml += `
                    </testsuite>
                </testsuites>
                `

                fulfil({
                    xml: xml,
                    success: rooibosResult.success,
                    empty: rooibosResult.totalTestCount == 0,
                    failedTestCount: rooibosResult.failedTestCount
                });
            });
        }

        function saveResults(results) {
            return new Promise((fulfil, reject) => {
                if (results.empty == false) {
                    const testResultsLoc = process.env.TEST_RESULTS_LOC || './source/tests/results/';
                    if (!fs.existsSync(testResultsLoc)) {
                        fs.mkdirSync(testResultsLoc);
                    }
                    fs.writeFile(testResultsLoc + 'test-results.xml', results.xml, err => {
                        if (err) {
                            reject(err);
                        }
                        console.log('\n Results saved to ' + testResultsLoc + 'test-results.xml \n ');
                    });
                }
                fulfil(results);
            });
        }

        function connect() {
            socket.connect(global.args.rooibosPort, ROKU_DEV_TARGET);
        }
    };
};
```

4. Add `rooibos_port=` to your test build's manifest file and use a build step to interpolate the `MANIFEST_ROOIBOS_PORT=20002` env var value.

___

## Changes

1. Adds a `return` [here](https://github.com/sky-uk/roku-rooibos-custom/blob/master/dist/lib/framework/Rooibos.bs#L29) to allow execution to return to Main.brs


2. Exposes the test results on a field of the Rooibos `testsScene`

[framework/src/source/TestRunner.bs](https://github.com/sky-uk/roku-rooibos-custom/blob/master/dist/lib/framework/TestRunner.bs#L102-L106)
```bs
rooibosResult = {
  stats: m.stats
  testSuites: m.testSuites
}
m.nodeContext.global.testsScene.rooibosTestResult = rooibosResult
```