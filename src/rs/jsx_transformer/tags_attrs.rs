use super::errors::JSXError;
use crate::jsx_parser::{JSXAttribute, JSXAttributeValue};

const COMMA: &str = ",";
const UNDERSCORE: char = '_';
const DOLLAR_SIGN: char = '$';

const VOID_TAGS: [&str; 23] = [
    "area", "base", "br", "circle", "col", "ellipse", "embed", "hr", "image", "img", "input",
    "line", "link", "meta", "param", "path", "polygon", "polyline", "rect", "source", "track",
    "use", "wbr",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TagType {
    Component,
    WebComponent,
    Void,
    Element,
}

#[inline(always)]
pub(crate) fn classify_tag(tag: &str) -> TagType {
    // Component: starts with uppercase, '_' or '$'
    if tag
        .chars()
        .next()
        .map(|c| c.is_uppercase() || c == UNDERSCORE || c == DOLLAR_SIGN)
        .unwrap_or(false)
    {
        return TagType::Component;
    }

    // Web Component: contains a hyphen per Custom Elements spec
    if tag.contains('-') {
        return TagType::WebComponent;
    }

    // Void element: binary search against sorted list (case-insensitive)
    let lower = tag.to_ascii_lowercase();
    if VOID_TAGS.binary_search(&lower.as_str()).is_ok() {
        return TagType::Void;
    }

    TagType::Element
}

// Unified attribute transformation helper
#[inline]
pub(crate) fn transform_attribute(attr: &JSXAttribute, target: TagType) -> String {
    match target {
        TagType::Component => match &attr.value {
            Some(JSXAttributeValue::Expression(expr)) => {
                format!(r#"{{"{}":{}}}"#, &attr.name, expr)
            }
            Some(JSXAttributeValue::DoubleQuote(value)) => {
                format!(r#"{{"{}":"{}"}}"#, &attr.name, value)
            }
            Some(JSXAttributeValue::SingleQuote(value)) => {
                format!(r#"{{"{}":'{}'}}"#, &attr.name, value)
            }
            None => {
                if attr.name.starts_with("...") {
                    format!("{{{}}}", attr.name)
                } else {
                    format!(r#"{{"{}":true}}"#, attr.name)
                }
            }
        },
        // Elements (including web components and voids) share the same serialization
        _ => {
            // Handle boolean and spread first (no normalized name for boolean to preserve legacy behavior)
            if attr.value.is_none() {
                if attr.name.starts_with("...") {
                    return format!("${{__jsxSpread({})}}", attr.name.replace("...", ""));
                } else {
                    return attr.name.to_string();
                }
            }

            let name = normalize_html_attr_name(&attr.name);
            match &attr.value {
                Some(JSXAttributeValue::Expression(expr)) => {
                    format!(r#"{name}="${{{expr}}}""#)
                }
                Some(JSXAttributeValue::DoubleQuote(value)) => {
                    format!(r#"{name}="{value}""#)
                }
                Some(JSXAttributeValue::SingleQuote(value)) => {
                    format!("{name}='{value}'")
                }
                None => unreachable!("handled above"),
            }
        }
    }
}

pub(crate) fn transform_component_attributes(attributes: &[JSXAttribute]) -> Result<String, JSXError> {
    let mut attr_parts = Vec::new();
    for attr in attributes.iter() {
        attr_parts.push(transform_attribute(attr, TagType::Component));
    }
    Ok(format!("[{}]", attr_parts.join(COMMA)))
}

pub(crate) fn transform_element_attributes(attributes: &[JSXAttribute]) -> Result<Vec<String>, JSXError> {
    let mut attr_parts = Vec::new();
    for attr in attributes {
        attr_parts.push(transform_attribute(attr, TagType::Element));
    }
    Ok(attr_parts)
}

// @see: https://github.com/denoland/deno_ast/blob/3aba071b59d71802398c2fbcd2d01c99a51553cf/src/transpiling/jsx_precompile.rs#L89
#[inline]
pub(crate) fn normalize_html_attr_name(name: &str) -> String {
    match name {
        // JSX specific
        "htmlFor" => "for".to_string(),
        "className" => "class".to_string(),
        "dangerouslySetInnerHTML" => name.to_string(),

        "panose1" => "panose-1".to_string(),
        "xlinkActuate" => "xlink:actuate".to_string(),
        "xlinkArcrole" => "xlink:arcrole".to_string(),

        // xlink:href was removed from SVG and isn't needed
        "xlinkHref" => "href".to_string(),
        "xlink:href" => "href".to_string(),

        "xlinkRole" => "xlink:role".to_string(),
        "xlinkShow" => "xlink:show".to_string(),
        "xlinkTitle" => "xlink:title".to_string(),
        "xlinkType" => "xlink:type".to_string(),
        "xmlBase" => "xml:base".to_string(),
        "xmlLang" => "xml:lang".to_string(),
        "xmlSpace" => "xml:space".to_string(),

        // Attributes that are kebab-cased
        "accentHeight"
        | "acceptCharset"
        | "alignmentBaseline"
        | "arabicForm"
        | "baselineShift"
        | "capHeight"
        | "clipPath"
        | "clipRule"
        | "colorInterpolation"
        | "colorInterpolationFilters"
        | "colorProfile"
        | "colorRendering"
        | "contentScriptType"
        | "contentStyleType"
        | "dominantBaseline"
        | "enableBackground"
        | "fillOpacity"
        | "fillRule"
        | "floodColor"
        | "floodOpacity"
        | "fontFamily"
        | "fontSize"
        | "fontSizeAdjust"
        | "fontStretch"
        | "fontStyle"
        | "fontVariant"
        | "fontWeight"
        | "glyphName"
        | "glyphOrientationHorizontal"
        | "glyphOrientationVertical"
        | "horizAdvX"
        | "horizOriginX"
        | "horizOriginY"
        | "httpEquiv"
        | "imageRendering"
        | "letterSpacing"
        | "lightingColor"
        | "markerEnd"
        | "markerMid"
        | "markerStart"
        | "overlinePosition"
        | "overlineThickness"
        | "paintOrder"
        | "pointerEvents"
        | "renderingIntent"
        | "shapeRendering"
        | "stopColor"
        | "stopOpacity"
        | "strikethroughPosition"
        | "strikethroughThickness"
        | "strokeDasharray"
        | "strokeDashoffset"
        | "strokeLinecap"
        | "strokeLinejoin"
        | "strokeMiterlimit"
        | "strokeOpacity"
        | "strokeWidth"
        | "textAnchor"
        | "textDecoration"
        | "textRendering"
        | "transformOrigin"
        | "underlinePosition"
        | "underlineThickness"
        | "unicodeBidi"
        | "unicodeRange"
        | "unitsPerEm"
        | "vAlphabetic"
        | "vectorEffect"
        | "vertAdvY"
        | "vertOriginX"
        | "vertOriginY"
        | "vHanging"
        | "vMathematical"
        | "wordSpacing"
        | "writingMode"
        | "xHeight" => name
            .chars()
            .map(|ch| match ch {
                'A'..='Z' => format!("-{}", ch.to_lowercase()),
                _ => ch.to_string(),
            })
            .collect(),

        // Attributes that are camelCased and should be kept as is.
        "allowReorder"
        | "attributeName"
        | "attributeType"
        | "baseFrequency"
        | "baseProfile"
        | "calcMode"
        | "clipPathUnits"
        | "diffuseConstant"
        | "edgeMode"
        | "filterUnits"
        | "glyphRef"
        | "gradientTransform"
        | "gradientUnits"
        | "kernelMatrix"
        | "kernelUnitLength"
        | "keyPoints"
        | "keySplines"
        | "keyTimes"
        | "lengthAdjust"
        | "limitingConeAngle"
        | "markerHeight"
        | "markerUnits"
        | "markerWidth"
        | "maskContentUnits"
        | "maskUnits"
        | "numOctaves"
        | "pathLength"
        | "patternContentUnits"
        | "patternTransform"
        | "patternUnits"
        | "pointsAtX"
        | "pointsAtY"
        | "pointsAtZ"
        | "preserveAlpha"
        | "preserveAspectRatio"
        | "primitiveUnits"
        | "referrerPolicy"
        | "refX"
        | "refY"
        | "repeatCount"
        | "repeatDur"
        | "requiredExtensions"
        | "requiredFeatures"
        | "specularConstant"
        | "specularExponent"
        | "spreadMethod"
        | "startOffset"
        | "stdDeviation"
        | "stitchTiles"
        | "surfaceScale"
        | "systemLanguage"
        | "tableValues"
        | "targetX"
        | "targetY"
        | "textLength"
        | "viewBox"
        | "xChannelSelector"
        | "yChannelSelector"
        | "zoomAndPan" => name.to_string(),

        _ => {
            // Devs expect attributes in the HTML document to be lowercased.
            name.to_lowercase()
        }
    }
}
