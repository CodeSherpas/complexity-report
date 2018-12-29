/*globals exports */

"use strict";

var thresholds = {
    cyclomatic: [3, 7, 12],
    halstead: [8, 13, 20]
};

exports.format = format;

function format(result) {
    return (
        createXMLDefinition() +
        createElement(
            0,
            "checkstyle",
            true,
            result.reports.reduce(function(formatted, report) {
                return formatted + formatModule(2, report);
            }, "")
        )
    );
}

function createXMLDefinition() {
    return '<?xml version="1.0" encoding="UTF-8" ?>\n';
}

function createElementWithAttributes(
    indentation,
    tag,
    attributes,
    linebreak,
    content
) {
    return createElementWithTags(
        indentation,
        tag + " " + attributes,
        tag,
        linebreak,
        content
    );
}

function createElementWithTags(
    indentation,
    openingTag,
    closingTag,
    linebreak,
    content
) {
    return (
        indent("<", indentation) +
        openingTag +
        ">" +
        (linebreak ? "\n" : "") +
        content +
        (linebreak ? indent("</", indentation) : "</") +
        closingTag +
        ">\n"
    );
}

function createEmptyElementWithAttributes(indentation, tag, attributes) {
    var nextIndentation = incrementIndentation(indentation);

    return (
        indent("<", indentation) +
        tag +
        "\n" +
        indent(attributes + "\n", nextIndentation) +
        indent("/>", indentation) +
        "\n"
    );
}

function indent(string, indentation) {
    return new Array(indentation + 1).join(" ") + string;
}

function formatModule(indentation, report) {
    var i,
        functions = "",
        nextIndentation = incrementIndentation(indentation);

    for (i = 0; i < report.functions.length; i += 1) {
        functions += formatFunction(nextIndentation, report.functions[i]);
    }

    return createElementWithAttributes(
        indentation,
        "file",
        'name="' + report.path + '"',
        true,
        functions
    );
}

function incrementIndentation(indentation) {
    return indentation + 2;
}

function formatFunction(indentation, data) {
    var nextIndentation = incrementIndentation(indentation);

    return createEmptyElementWithAttributes(
        indentation,
        "error",
        [
            'line="' + data.line + '"',
            'severity="' + assignSeverity(data) + '"',
            'message="Cyclomatic: ' + data.cyclomatic + ",",
            "Halstead: " + data.halstead.difficulty.toPrecision(5),
            "| Effort: " + data.halstead.effort.toPrecision(5),
            "| Volume: " + data.halstead.volume.toPrecision(5),
            "| Vocabulary: " + data.halstead.vocabulary + '"',
            'source="' +
                data.name.replace("<", "&lt;").replace(">", "&gt;") +
                '"'
        ].join("\n" + indent("", nextIndentation))
    );
}

function createElement(indentation, tag, linebreak, content) {
    return createElementWithTags(indentation, tag, tag, linebreak, content);
}

function assignSeverity(data) {
    var levels = ["info", "warning", "error"],
        severity = levels[0];

    levels.forEach(function(level, i) {
        if (
            data.cyclomatic > thresholds.cyclomatic[i] ||
            data.halstead.difficulty > thresholds.halstead[i]
        ) {
            severity = levels[i];
        }
    });

    return severity;
}
