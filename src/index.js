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
return getFiles(cli.args)
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
    let allFiles = '';

    for (let p of path) {
        allFiles += await find(p)
    }

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
        console.error('getReports', err);
    }
}

function writeReports (aComplexityReport) {
    const reporter =  new ComplexityReporter(aComplexityReport)
    var formatted = reporter[cli.format] ? reporter[cli.format] : reporter.json;

    if (cli.output) {
        fs.writeFile(cli.output, formatted, 'utf8', function (err) {
            if (err) {
                error('writeReport', err);
            }
        });
    } else {
        console.log(formatted); // eslint-disable-line no-console
    }
}
