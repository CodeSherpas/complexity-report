#!/usr/bin/env node

/*globals require, process, console */

'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readFile = util.promisify(require('fs').readFile);

var options, state, queue,
cli = require('commander'),
fs = require('fs'),
escomplex = require('typhonjs-escomplex');
const ComplexityReporter  = require('complexity-reporters')

parseCommandLine();

expectFiles(cli.args, cli.help.bind(cli));
return getFiles(cli.args[0])
	.then( filesToAnalyze => {
		return Promise.all(filesToAnalyze.map(async f => {
			
			return {
				code: await readFile(f, 'utf8'),
				srcPath: f
			}
		}))
	})
	.then(getReports)

function parseCommandLine () {
    var config;

    cli.
        usage('[options] <path>').
        option('-c, --config <path>', 'specify path to configuration JSON file').
        option('-o, --output <path>', 'specify an output file for the report').
        option('-f, --format <format>', 'specify the output format of the report').
        option('-e, --ignoreerrors', 'ignore parser errors').
        option('-a, --allfiles', 'include hidden files in the report').
        option('-p, --filepattern <pattern>', 'specify the files to process using a regular expression to match against file names').
        option('-x, --excludepattern <pattern>', 'specify the files to exclude using a regular expression, exclude overrides include').
        parse(process.argv);

    options = {
        logicalor: false,
        switchcase: true,
        forin: false,
        trycatch: false,
        newmi: true,
        ignoreErrors: cli.ignoreerrors || false,
        noCoreSize: true
    };

    if (!cli.filepattern) {
        cli.filepattern = '\\.(j|t)sx?$';
    }
    cli.filepattern = new RegExp(cli.filepattern);

    if (cli.excludepattern) {
        cli.excludepattern = new RegExp(cli.excludepattern);
    }


}
async function find(path) {
  const { stdout, stderr } = await exec(`find ${path}`);

  return stdout;
}


async function getFiles(path) {
	let result;

	let allFiles = await find(path)
	result = allFiles.split('\n').filter(f => cli.filepattern.test(f) && /\.(j|t)sx?$/.test(f))

	if (cli.excludepattern) {
		result = result.filter(f => !cli.excludepattern.test(f))
	}

	return result
}

function expectFiles (paths, noFilesFn) {
    if (paths.length === 0) {
        noFilesFn();
    }
}


function beginsWithShebang (source) {
    return source[0] === '#' && source[1] === '!';
}

function commentFirstLine (source) {
    return '//' + source;
}

function getReports (sources) {
    try {
        writeReports(escomplex.analyzeProject(sources, options, {allowReturnOutsideFunction: true}));
    } catch (err) {
        error('getReports', err);
    }
}

function writeReports (aComplexityReport) {
    const reporter =  new ComplexityReporter(aComplexityReport)
    var formatted = (typeof reporter[cli.format] == 'object') ? reporter[cli.format] : reporter.json;

    if (cli.output) {
        fs.writeFile(cli.output, formatted, 'utf8', function (err) {
            if (err) {
                error('writeReport', err);
            }
        });
    } else {
        console.log(JSON.stringify(formatted, null, 4)); // eslint-disable-line no-console
    }
}
