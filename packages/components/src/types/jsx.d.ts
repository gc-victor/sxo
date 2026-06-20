/**
 * Shared JSDoc typedefs for the collection of components.
 *
 * Why:
 * - Components in this example output HTML strings (via a custom JSX transformer),
 *   not React elements. Using a JSX-like alias keeps docs readable without pulling
 *   in the TypeScript JSX namespace.
 *
 * When to use JSX.Element:
 * - @returns for components/functions that emit markup strings.
 * - @param for children-like props that accept markup strings (for example, [props.children]).
 * - @type for variables/constants that hold pre-rendered markup strings.
 *
 * Examples (JSDoc in .jsx files):
 *   Return value typing:
 *     @returns {JSX.Element}
 *     export function MyComp({ children }) {
 *       return <div>{children}</div>;
 *     }
 *
 *   Children prop typing:
 *     @param {Object} props
 *     @param {JSX.Element} [props.children]
 *     export function Item({ children }) { … }
 *
 *   Variable typing:
 *     @type {JSX.Element}
 *     const markup = <span>Hello</span>;
 *
 * Do NOT use JSX.Element for:
 * - Event handlers, non-markup data objects, or primitives.
 * - Framework element/node types (for example, React/Vue elements).
 *
 * Usage in JSDoc (JS files):
 * - @returns {JSX.Element}
 * - @type {JSX.Element}
 */

declare global {
    /**
     * Minimal TypeScript JSX namespace so `JSX.Element` and `JSX.IntrinsicElements`
     * are available for .jsx files that emit HTML strings via the custom transformer.
     *
     * - `Element` maps to `string` because our runtime output is HTML strings.
     * - `IntrinsicElements` is permissive (`any`) to allow arbitrary HTML tags/props.
     */
    namespace JSX {
        type Element = string;

        interface IntrinsicElements {
            [elemName: string]: unknown;
        }
    }

    /**
     * Common component props for the components.
     * - class / className: optional CSS class names (both supported for convenience).
     * - children: nested markup or string content (HTML string via custom JSX or plain text).
     * - Reactive bindings: $state, $ref, and $bind-* attributes (alphanumeric state keys).
     */
    type RCBindingAttributes = {
        /**
         * Reactive Component attributes (HTML-first bindings).
         * Notes:
         * - Values are state keys (strictly alphanumeric per binding validation).
         * - `$bind-html` renders unsanitized HTML. Sanitize untrusted content before use.
         * - Custom bindings are supported via `$bind-<type>`; e.g. `$bind-animate-count`.
         */
        $state?: string;
        $ref?: string;
        "$bind-text"?: string;
        "$bind-html"?: string;
        "$bind-value"?: string;
        "$bind-checked"?: string;
        "$bind-disabled"?: string;
        "$bind-class"?: string;
        "$bind-attr"?: string;
    } & {
        /**
         * Support for any custom `$bind-*` attribute names.
         * Example: `$bind-animate-count="counter"`
         */
        [K in `$bind-${string}`]?: string;
    } & {
        /**
         * Support for any custom `$on*` event handler attribute names.
         * Example: `$onclick="handler"`
         */
        [K in `$on${string}`]?: string;
    };

    interface ComponentProps extends RCBindingAttributes {
        class?: string;
        className?: string;
        children?: JSX.Element | JSX.Element[];
    }

    /**
     * SVG element attributes (regular + presentation).
     * Source: svg-attributes (https://github.com/alexmingoia/svg-attributes)
     * All properties are optional and represented as strings in keeping with the
     * string-based HTML output rendering approach used by this project.
     */
    interface HTMLSVGAttributes extends HTMLElementAttributes {
        // Regular attributes
        accentHeight?: string;
        accumulate?: string;
        additive?: string;
        alphabetic?: string;
        amplitude?: string;
        arabicForm?: string;
        ascent?: string;
        attributeName?: string;
        attributeType?: string;
        azimuth?: string;
        baseFrequency?: string;
        baseProfile?: string;
        bbox?: string;
        begin?: string;
        bias?: string;
        by?: string;
        calcMode?: string;
        capHeight?: string;
        clipPathUnits?: string;
        contentScriptType?: string;
        contentStyleType?: string;
        cx?: string;
        cy?: string;
        d?: string;
        descent?: string;
        diffuseConstant?: string;
        divisor?: string;
        dur?: string;
        dx?: string;
        dy?: string;
        edgeMode?: string;
        elevation?: string;
        end?: string;
        exponent?: string;
        externalResourcesRequired?: string;
        fill?: string;
        filterRes?: string;
        filterUnits?: string;
        fontFamily?: string;
        fontSize?: string;
        fontStretch?: string;
        fontStyle?: string;
        format?: string;
        from?: string;
        fx?: string;
        fy?: string;
        g1?: string;
        g2?: string;
        glyphame?: string; // Note: appears to be a typo for 'glyphName' in source list.
        glyphRef?: string;
        gradientTransform?: string;
        gradientUnits?: string;
        hanging?: string;
        height?: string;
        horizAdvX?: string;
        horizOriginX?: string;
        horizOriginY?: string;
        ideographic?: string;
        in?: string;
        in2?: string;
        intercept?: string;
        k?: string;
        k1?: string;
        k2?: string;
        k3?: string;
        k4?: string;
        kernelMatrix?: string;
        kernelUnitLength?: string;
        keyPoints?: string;
        keySplines?: string;
        keyTimes?: string;
        lengthAdjust?: string;
        limitingConeAngle?: string;
        local?: string;
        markerHeight?: string;
        markerUnits?: string;
        markerWidth?: string;
        maskContentUnits?: string;
        maskUnits?: string;
        mathematical?: string;
        max?: string;
        media?: string;
        method?: string;
        min?: string;
        mode?: string;
        name?: string;
        numOctaves?: string;
        offset?: string;
        onAbort?: string;
        onActivate?: string;
        onBegin?: string;
        onClick?: string;
        onEnd?: string;
        onError?: string;
        onFocusIn?: string;
        onFocusOut?: string;
        onLoad?: string;
        onMouseDown?: string;
        onMouseMove?: string;
        onMouseOut?: string;
        onMouseOver?: string;
        onMouseUp?: string;
        onRepeat?: string;
        onResize?: string;
        onScroll?: string;
        onUnload?: string;
        onZoom?: string;
        operator?: string;
        order?: string;
        orient?: string;
        orientation?: string;
        origin?: string;
        overlinePosition?: string;
        overlineThickness?: string;
        panose1?: string;
        path?: string;
        pathLength?: string;
        patternContentUnits?: string;
        patternTransform?: string;
        patternUnits?: string;
        points?: string;
        pointsAtX?: string;
        pointsAtY?: string;
        pointsAtZ?: string;
        preserveAlpha?: string;
        preserveAspectRatio?: string;
        primitiveUnits?: string;
        r?: string;
        radius?: string;
        refX?: string;
        refY?: string;
        renderingIntent?: string;
        repeatCount?: string;
        repeatDur?: string;
        requiredExtensions?: string;
        requiredFeatures?: string;
        restart?: string;
        result?: string;
        rotate?: string;
        rx?: string;
        ry?: string;
        scale?: string;
        seed?: string;
        slope?: string;
        spacing?: string;
        specularConstant?: string;
        specularExponent?: string;
        spreadMethod?: string;
        startOffset?: string;
        stdDeviation?: string;
        stemh?: string;
        stemv?: string;
        stitchTiles?: string;
        strikethroughPosition?: string;
        strikethroughThickness?: string;
        string?: string;
        surfaceScale?: string;
        systemLanguage?: string;
        tableValues?: string;
        target?: string;
        targetX?: string;
        targetY?: string;
        textLength?: string;
        to?: string;
        transform?: string;
        type?: string;
        u1?: string;
        u2?: string;
        underlinePosition?: string;
        underlineThickness?: string;
        unicode?: string;
        unicodeRange?: string;
        unitsPerEm?: string;
        vAlphabetic?: string;
        vHanging?: string;
        vIdeographic?: string;
        vMathematical?: string;
        values?: string;
        version?: string;
        vertAdvY?: string;
        vertOriginX?: string;
        vertOriginY?: string;
        viewBox?: string;
        viewTarget?: string;
        width?: string;
        widths?: string;
        x?: string;
        xHeight?: string;
        x1?: string;
        x2?: string;
        xChannelSelector?: string;
        xlink?: string;
        xml?: string;
        y?: string;
        y1?: string;
        y2?: string;
        yChannelSelector?: string;
        z?: string;
        zoomAndPan?: string;

        // Presentation attributes
        alignmentBaseline?: string;
        baselineShift?: string;
        clipPath?: string;
        clipRule?: string;
        clip?: string;
        colorInterpolationFilters?: string;
        colorInterpolation?: string;
        colorProfile?: string;
        colorRendering?: string;
        color?: string;
        cursor?: string;
        direction?: string;
        display?: string;
        dominantBaseline?: string;
        enableBackground?: string;
        fillOpacity?: string;
        fillRule?: string;
        filter?: string;
        floodColor?: string;
        floodOpacity?: string;
        fontSizeAdjust?: string;
        fontVariant?: string;
        fontWeight?: string;
        glyphOrientationHorizontal?: string;
        glyphOrientationVertical?: string;
        imageRendering?: string;
        kerning?: string;
        letterSpacing?: string;
        lightingColor?: string;
        markerEnd?: string;
        markerMid?: string;
        markerStart?: string;
        mask?: string;
        opacity?: string;
        overflow?: string;
        pointerEvents?: string;
        shapeRendering?: string;
        stopColor?: string;
        stopOpacity?: string;
        strokeDasharray?: string;
        strokeDashoffset?: string;
        strokeLinecap?: string;
        strokeLinejoin?: string;
        strokeMiterlimit?: string;
        strokeOpacity?: string;
        strokeWidth?: string;
        stroke?: string;
        textAnchor?: string;
        textDecoration?: string;
        textRendering?: string;
        unicodeBidi?: string;
        visibility?: string;
        wordSpacing?: string;
        writingMode?: string;
    }

    /**
     * ARIA accessibility attributes.
     * All ARIA attributes are optional and represented as strings.
     * Source: WAI-ARIA specification.
     */
    interface HTMLAriaAttributes {
        "aria-activedescendant"?: string;
        "aria-atomic"?: string;
        "aria-autocomplete"?: string;
        "aria-busy"?: string;
        "aria-checked"?: string;
        "aria-colcount"?: string;
        "aria-colindex"?: string;
        "aria-colspan"?: string;
        "aria-controls"?: string;
        "aria-current"?: string;
        "aria-describedby"?: string;
        "aria-details"?: string;
        "aria-disabled"?: string;
        "aria-dropeffect"?: string;
        "aria-errormessage"?: string;
        "aria-expanded"?: string;
        "aria-flowto"?: string;
        "aria-grabbed"?: string;
        "aria-haspopup"?: string;
        "aria-hidden"?: string;
        "aria-invalid"?: string;
        "aria-keyshortcuts"?: string;
        "aria-label"?: string;
        "aria-labelledby"?: string;
        "aria-level"?: string;
        "aria-live"?: string;
        "aria-modal"?: string;
        "aria-multiline"?: string;
        "aria-multiselectable"?: string;
        "aria-orientation"?: string;
        "aria-owns"?: string;
        "aria-placeholder"?: string;
        "aria-posinset"?: string;
        "aria-pressed"?: string;
        "aria-readonly"?: string;
        "aria-relevant"?: string;
        "aria-required"?: string;
        "aria-roledescription"?: string;
        "aria-rowcount"?: string;
        "aria-rowindex"?: string;
        "aria-rowspan"?: string;
        "aria-selected"?: string;
        "aria-setsize"?: string;
        "aria-sort"?: string;
        "aria-valuemax"?: string;
        "aria-valuemin"?: string;
        "aria-valuenow"?: string;
        "aria-valuetext"?: string;
    }

    /**
     * HTML event handler attributes.
     * All event handlers are optional and represented as strings (inline handlers).
     * Source: HTML standard event handlers.
     */
    interface HTMLEventAttributes {
        onabort?: string;
        onactivate?: string;
        onbegin?: string;
        onclick?: string;
        ondblclick?: string;
        onmousedown?: string;
        onmouseup?: string;
        onmouseover?: string;
        onmousemove?: string;
        onmouseout?: string;
        onmouseenter?: string;
        onmouseleave?: string;
        oncontextmenu?: string;
        onfocus?: string;
        onblur?: string;
        oninput?: string;
        onchange?: string;
        onsubmit?: string;
        onreset?: string;
        oninvalid?: string;
        onselect?: string;
        onkeydown?: string;
        onkeypress?: string;
        onkeyup?: string;
        onload?: string;
        onunload?: string;
        onerror?: string;
        onresize?: string;
        onscroll?: string;
        onwheel?: string;
        ondrag?: string;
        ondragstart?: string;
        ondragend?: string;
        ondragover?: string;
        ondragenter?: string;
        ondragleave?: string;
        ondrop?: string;
        onpointerdown?: string;
        onpointerup?: string;
        onpointermove?: string;
        onpointerenter?: string;
        onpointerleave?: string;
        onpointercancel?: string;
        ontouchstart?: string;
        ontouchend?: string;
        ontouchmove?: string;
        ontouchcancel?: string;
    }

    /**
     * Common HTML attributes shared across all elements.
     * Includes global attributes like id, class, style, data-*, etc.
     * Extends HTMLAriaAttributes for accessibility support and HTMLEventAttributes for event handlers.
     */
    interface HTMLElementAttributes extends HTMLAriaAttributes, HTMLEventAttributes {
        accesskey?: string;
        autocapitalize?: string;
        autofocus?: boolean | string;
        class?: string;
        contenteditable?: boolean | string;
        dir?: string;
        draggable?: boolean | string;
        enterkeyhint?: string;
        hidden?: boolean | string;
        id?: string;
        inputmode?: string;
        is?: string;
        itemid?: string;
        itemprop?: string;
        itemref?: string;
        itemscope?: boolean | string;
        role?: string;
        itemtype?: string;
        lang?: string;
        nonce?: string;
        slot?: string;
        spellcheck?: boolean | string;
        style?: string;
        tabindex?: number | string;
        title?: string;
        translate?: string;
    }

    /**
     * HTML <a> element attributes.
     * @example
     * // JSDoc usage:
     * // @property {HTMLAnchorAttributes} [rest] - Additional <a> attributes
     */
    interface HTMLAnchorAttributes extends HTMLElementAttributes {
        charset?: string;
        coords?: string;
        download?: string;
        href?: string;
        hreflang?: string;
        name?: string;
        ping?: string;
        referrerpolicy?: string;
        rel?: string;
        rev?: string;
        shape?: string;
        target?: string;
        type?: string;
    }

    /**
     * HTML <abbr> element attributes.
     */
    interface HTMLAbbrAttributes extends HTMLElementAttributes {
        title?: string;
    }

    /**
     * HTML <applet> element attributes (deprecated).
     */
    interface HTMLAppletAttributes extends HTMLElementAttributes {
        align?: string;
        alt?: string;
        archive?: string;
        code?: string;
        codebase?: string;
        height?: number | string;
        hspace?: number | string;
        name?: string;
        object?: string;
        vspace?: number | string;
        width?: number | string;
    }

    /**
     * HTML <area> element attributes.
     */
    interface HTMLAreaAttributes extends HTMLElementAttributes {
        alt?: string;
        coords?: string;
        download?: string;
        href?: string;
        hreflang?: string;
        nohref?: boolean | string;
        ping?: string;
        referrerpolicy?: string;
        rel?: string;
        shape?: string;
        target?: string;
        type?: string;
    }

    /**
     * HTML <audio> element attributes.
     */
    interface HTMLAudioAttributes extends HTMLElementAttributes {
        autoplay?: boolean | string;
        controls?: boolean | string;
        crossorigin?: string;
        loop?: boolean | string;
        muted?: boolean | string;
        preload?: string;
        src?: string;
    }

    /**
     * HTML <base> element attributes.
     */
    interface HTMLBaseAttributes extends HTMLElementAttributes {
        href?: string;
        target?: string;
    }

    /**
     * HTML <basefont> element attributes (deprecated).
     */
    interface HTMLBaseFontAttributes extends HTMLElementAttributes {
        color?: string;
        face?: string;
        size?: number | string;
    }

    /**
     * HTML <bdo> element attributes.
     */
    interface HTMLBdoAttributes extends HTMLElementAttributes {
        dir?: string;
    }

    /**
     * HTML <blockquote> element attributes.
     */
    interface HTMLBlockquoteAttributes extends HTMLElementAttributes {
        cite?: string;
    }

    /**
     * HTML <body> element attributes.
     */
    interface HTMLBodyAttributes extends HTMLElementAttributes {
        alink?: string;
        background?: string;
        bgcolor?: string;
        link?: string;
        text?: string;
        vlink?: string;
    }

    /**
     * HTML <br> element attributes.
     */
    interface HTMLBrAttributes extends HTMLElementAttributes {
        clear?: string;
    }

    /**
     * HTML <button> element attributes.
     */
    interface HTMLButtonAttributes extends HTMLElementAttributes {
        autofocus?: boolean | string;
        disabled?: boolean | string;
        form?: string;
        formaction?: string;
        formenctype?: string;
        formmethod?: string;
        formnovalidate?: boolean | string;
        formtarget?: string;
        name?: string;
        type?: string;
        value?: string;
        popovertarget?: string;
    }

    /**
     * HTML <canvas> element attributes.
     */
    interface HTMLCanvasAttributes extends HTMLElementAttributes {
        height?: number | string;
        width?: number | string;
    }

    /**
     * HTML <caption> element attributes.
     */
    interface HTMLCaptionAttributes extends HTMLElementAttributes {
        align?: string;
    }

    /**
     * HTML <col> element attributes.
     */
    interface HTMLColAttributes extends HTMLElementAttributes {
        align?: string;
        char?: string;
        charoff?: string;
        span?: number | string;
        valign?: string;
        width?: number | string;
    }

    /**
     * HTML <colgroup> element attributes.
     */
    interface HTMLColGroupAttributes extends HTMLElementAttributes {
        align?: string;
        char?: string;
        charoff?: string;
        span?: number | string;
        valign?: string;
        width?: number | string;
    }

    /**
     * HTML <data> element attributes.
     */
    interface HTMLDataAttributes extends HTMLElementAttributes {
        value?: string;
    }

    /**
     * HTML <del> element attributes.
     */
    interface HTMLDelAttributes extends HTMLElementAttributes {
        cite?: string;
        datetime?: string;
    }

    /**
     * HTML <details> element attributes.
     */
    interface HTMLDetailsAttributes extends HTMLElementAttributes {
        open?: boolean | string;
    }

    /**
     * HTML <dfn> element attributes.
     */
    interface HTMLDfnAttributes extends HTMLElementAttributes {
        title?: string;
    }

    /**
     * HTML <dialog> element attributes.
     */
    interface HTMLDialogAttributes extends HTMLElementAttributes {
        open?: boolean | string;
    }

    /**
     * HTML <dir> element attributes (deprecated).
     */
    interface HTMLDirAttributes extends HTMLElementAttributes {
        compact?: boolean | string;
    }

    /**
     * HTML <div> element attributes.
     */
    interface HTMLDivAttributes extends HTMLElementAttributes {
        align?: string;
    }

    /**
     * HTML <dl> element attributes.
     */
    interface HTMLDlAttributes extends HTMLElementAttributes {
        compact?: boolean | string;
    }

    /**
     * HTML <embed> element attributes.
     */
    interface HTMLEmbedAttributes extends HTMLElementAttributes {
        height?: number | string;
        src?: string;
        type?: string;
        width?: number | string;
    }

    /**
     * HTML <fieldset> element attributes.
     */
    interface HTMLFieldSetAttributes extends HTMLElementAttributes {
        disabled?: boolean | string;
        form?: string;
        name?: string;
    }

    /**
     * HTML <font> element attributes (deprecated).
     */
    interface HTMLFontAttributes extends HTMLElementAttributes {
        color?: string;
        face?: string;
        size?: number | string;
    }

    /**
     * HTML <form> element attributes.
     */
    interface HTMLFormAttributes extends HTMLElementAttributes {
        accept?: string;
        "accept-charset"?: string;
        action?: string;
        autocomplete?: string;
        enctype?: string;
        method?: string;
        name?: string;
        novalidate?: boolean | string;
        target?: string;
    }

    /**
     * HTML <frame> element attributes (deprecated).
     */
    interface HTMLFrameAttributes extends HTMLElementAttributes {
        frameborder?: string;
        longdesc?: string;
        marginheight?: number | string;
        marginwidth?: number | string;
        name?: string;
        noresize?: boolean | string;
        scrolling?: string;
        src?: string;
    }

    /**
     * HTML <frameset> element attributes (deprecated).
     */
    interface HTMLFrameSetAttributes extends HTMLElementAttributes {
        cols?: string;
        rows?: string;
    }

    /**
     * HTML heading element attributes (h1-h6).
     */
    interface HTMLHeadingAttributes extends HTMLElementAttributes {
        align?: string;
    }

    /**
     * HTML <head> element attributes.
     */
    interface HTMLHeadAttributes extends HTMLElementAttributes {
        profile?: string;
    }

    /**
     * HTML <hr> element attributes.
     */
    interface HTMLHrAttributes extends HTMLElementAttributes {
        align?: string;
        noshade?: boolean | string;
        size?: number | string;
        width?: number | string;
    }

    /**
     * HTML <html> element attributes.
     */
    interface HTMLHtmlAttributes extends HTMLElementAttributes {
        manifest?: string;
        version?: string;
    }

    /**
     * HTML <iframe> element attributes.
     */
    interface HTMLIFrameAttributes extends HTMLElementAttributes {
        align?: string;
        allow?: string;
        allowfullscreen?: boolean | string;
        allowpaymentrequest?: boolean | string;
        allowusermedia?: boolean | string;
        frameborder?: string;
        height?: number | string;
        loading?: string;
        longdesc?: string;
        marginheight?: number | string;
        marginwidth?: number | string;
        name?: string;
        referrerpolicy?: string;
        sandbox?: string;
        scrolling?: string;
        src?: string;
        srcdoc?: string;
        width?: number | string;
    }

    /**
     * HTML <img> element attributes.
     */
    interface HTMLImgAttributes extends HTMLElementAttributes {
        align?: string;
        alt?: string;
        border?: string;
        crossorigin?: string;
        decoding?: string;
        height?: number | string;
        hspace?: number | string;
        ismap?: boolean | string;
        loading?: string;
        longdesc?: string;
        name?: string;
        referrerpolicy?: string;
        sizes?: string;
        src?: string;
        srcset?: string;
        usemap?: string;
        vspace?: number | string;
        width?: number | string;
    }

    /**
     * HTML <input> element attributes.
     * @example
     * // JSDoc usage:
     * // @property {HTMLInputAttributes} [rest] - Additional native <input> attributes (spread).
     * //   Accepts any valid HTMLInputElement attribute plus arbitrary data-/aria- props.
     */
    interface HTMLInputAttributes extends HTMLElementAttributes {
        accept?: string;
        align?: string;
        alt?: string;
        autocomplete?: string;
        autofocus?: boolean | string;
        checked?: boolean | string;
        dirname?: string;
        disabled?: boolean | string;
        form?: string;
        formaction?: string;
        formenctype?: string;
        formmethod?: string;
        formnovalidate?: boolean | string;
        formtarget?: string;
        height?: number | string;
        ismap?: boolean | string;
        list?: string;
        max?: number | string;
        maxlength?: number | string;
        min?: number | string;
        minlength?: number | string;
        multiple?: boolean | string;
        name?: string;
        pattern?: string;
        placeholder?: string;
        readonly?: boolean | string;
        required?: boolean | string;
        size?: number | string;
        src?: string;
        step?: number | string;
        type?: string;
        usemap?: string;
        value?: string;
        width?: number | string;
    }

    /**
     * HTML <ins> element attributes.
     */
    interface HTMLInsAttributes extends HTMLElementAttributes {
        cite?: string;
        datetime?: string;
    }

    /**
     * HTML <isindex> element attributes (deprecated).
     */
    interface HTMLIsIndexAttributes extends HTMLElementAttributes {
        prompt?: string;
    }

    /**
     * HTML <label> element attributes.
     */
    interface HTMLLabelAttributes extends HTMLElementAttributes {
        for?: string;
        form?: string;
    }

    /**
     * HTML <legend> element attributes.
     */
    interface HTMLLegendAttributes extends HTMLElementAttributes {
        align?: string;
    }

    /**
     * HTML <li> element attributes.
     */
    interface HTMLLiAttributes extends HTMLElementAttributes {
        type?: string;
        value?: number | string;
    }

    /**
     * HTML <link> element attributes.
     */
    interface HTMLLinkAttributes extends HTMLElementAttributes {
        as?: string;
        charset?: string;
        color?: string;
        crossorigin?: string;
        disabled?: boolean | string;
        href?: string;
        hreflang?: string;
        imagesizes?: string;
        imagesrcset?: string;
        integrity?: string;
        media?: string;
        referrerpolicy?: string;
        rel?: string;
        rev?: string;
        sizes?: string;
        target?: string;
        type?: string;
    }

    /**
     * HTML <map> element attributes.
     */
    interface HTMLMapAttributes extends HTMLElementAttributes {
        name?: string;
    }

    /**
     * HTML <menu> element attributes.
     */
    interface HTMLMenuAttributes extends HTMLElementAttributes {
        compact?: boolean | string;
    }

    /**
     * HTML <meta> element attributes.
     */
    interface HTMLMetaAttributes extends HTMLElementAttributes {
        charset?: string;
        content?: string;
        "http-equiv"?: string;
        name?: string;
        scheme?: string;
    }

    /**
     * HTML <meter> element attributes.
     */
    interface HTMLMeterAttributes extends HTMLElementAttributes {
        high?: number | string;
        low?: number | string;
        max?: number | string;
        min?: number | string;
        optimum?: number | string;
        value?: number | string;
    }

    /**
     * HTML <object> element attributes.
     */
    interface HTMLObjectAttributes extends HTMLElementAttributes {
        align?: string;
        archive?: string;
        border?: string;
        classid?: string;
        codebase?: string;
        codetype?: string;
        data?: string;
        declare?: boolean | string;
        form?: string;
        height?: number | string;
        hspace?: number | string;
        name?: string;
        standby?: string;
        type?: string;
        typemustmatch?: boolean | string;
        usemap?: string;
        vspace?: number | string;
        width?: number | string;
    }

    /**
     * HTML <ol> element attributes.
     */
    interface HTMLOlAttributes extends HTMLElementAttributes {
        compact?: boolean | string;
        reversed?: boolean | string;
        start?: number | string;
        type?: string;
    }

    /**
     * HTML <optgroup> element attributes.
     */
    interface HTMLOptGroupAttributes extends HTMLElementAttributes {
        disabled?: boolean | string;
        label?: string;
    }

    /**
     * HTML <option> element attributes.
     */
    interface HTMLOptionAttributes extends HTMLElementAttributes {
        disabled?: boolean | string;
        label?: string;
        selected?: boolean | string;
        value?: string;
    }

    /**
     * HTML <output> element attributes.
     */
    interface HTMLOutputAttributes extends HTMLElementAttributes {
        for?: string;
        form?: string;
        name?: string;
    }

    /**
     * HTML <p> element attributes.
     */
    interface HTMLParagraphAttributes extends HTMLElementAttributes {
        align?: string;
    }

    /**
     * HTML <param> element attributes.
     */
    interface HTMLParamAttributes extends HTMLElementAttributes {
        name?: string;
        type?: string;
        value?: string;
        valuetype?: string;
    }

    /**
     * HTML <pre> element attributes.
     */
    interface HTMLPreAttributes extends HTMLElementAttributes {
        width?: number | string;
    }

    /**
     * HTML <progress> element attributes.
     */
    interface HTMLProgressAttributes extends HTMLElementAttributes {
        max?: number | string;
        value?: number | string;
    }

    /**
     * HTML <q> element attributes.
     */
    interface HTMLQuoteAttributes extends HTMLElementAttributes {
        cite?: string;
    }

    /**
     * HTML <script> element attributes.
     */
    interface HTMLScriptAttributes extends HTMLElementAttributes {
        async?: boolean | string;
        charset?: string;
        crossorigin?: string;
        defer?: boolean | string;
        integrity?: string;
        language?: string;
        nomodule?: boolean | string;
        referrerpolicy?: string;
        src?: string;
        type?: string;
    }

    /**
     * HTML <select> element attributes.
     */
    interface HTMLSelectAttributes extends HTMLElementAttributes {
        autocomplete?: string;
        autofocus?: boolean | string;
        disabled?: boolean | string;
        form?: string;
        multiple?: boolean | string;
        name?: string;
        required?: boolean | string;
        size?: number | string;
    }

    /**
     * HTML <slot> element attributes.
     */
    interface HTMLSlotAttributes extends HTMLElementAttributes {
        name?: string;
    }

    /**
     * HTML <source> element attributes.
     */
    interface HTMLSourceAttributes extends HTMLElementAttributes {
        media?: string;
        sizes?: string;
        src?: string;
        srcset?: string;
        type?: string;
    }

    /**
     * HTML <style> element attributes.
     */
    interface HTMLStyleAttributes extends HTMLElementAttributes {
        media?: string;
        type?: string;
    }

    /**
     * HTML <table> element attributes.
     */
    interface HTMLTableAttributes extends HTMLElementAttributes {
        align?: string;
        bgcolor?: string;
        border?: string;
        cellpadding?: number | string;
        cellspacing?: number | string;
        frame?: string;
        rules?: string;
        summary?: string;
        width?: number | string;
    }

    /**
     * HTML table section element attributes (tbody, thead, tfoot).
     */
    interface HTMLTableSectionAttributes extends HTMLElementAttributes {
        align?: string;
        char?: string;
        charoff?: string;
        valign?: string;
    }

    /**
     * HTML table cell element attributes (td, th).
     */
    interface HTMLTableCellAttributes extends HTMLElementAttributes {
        abbr?: string;
        align?: string;
        axis?: string;
        bgcolor?: string;
        char?: string;
        charoff?: string;
        colspan?: number | string;
        headers?: string;
        height?: number | string;
        nowrap?: boolean | string;
        rowspan?: number | string;
        scope?: string;
        valign?: string;
        width?: number | string;
    }

    /**
     * HTML <textarea> element attributes.
     */
    interface HTMLTextAreaAttributes extends HTMLElementAttributes {
        autocomplete?: string;
        autofocus?: boolean | string;
        cols?: number | string;
        dirname?: string;
        disabled?: boolean | string;
        form?: string;
        maxlength?: number | string;
        minlength?: number | string;
        name?: string;
        placeholder?: string;
        readonly?: boolean | string;
        required?: boolean | string;
        rows?: number | string;
        wrap?: string;
    }

    /**
     * HTML <time> element attributes.
     */
    interface HTMLTimeAttributes extends HTMLElementAttributes {
        datetime?: string;
    }

    /**
     * HTML <tr> element attributes.
     */
    interface HTMLTableRowAttributes extends HTMLElementAttributes {
        align?: string;
        bgcolor?: string;
        char?: string;
        charoff?: string;
        valign?: string;
    }

    /**
     * HTML <track> element attributes.
     */
    interface HTMLTrackAttributes extends HTMLElementAttributes {
        default?: boolean | string;
        kind?: string;
        label?: string;
        src?: string;
        srclang?: string;
    }

    /**
     * HTML <ul> element attributes.
     */
    interface HTMLUlAttributes extends HTMLElementAttributes {
        compact?: boolean | string;
        type?: string;
    }

    /**
     * HTML <video> element attributes.
     */
    interface HTMLVideoAttributes extends HTMLElementAttributes {
        autoplay?: boolean | string;
        controls?: boolean | string;
        crossorigin?: string;
        height?: number | string;
        loop?: boolean | string;
        muted?: boolean | string;
        playsinline?: boolean | string;
        poster?: string;
        preload?: string;
        src?: string;
        width?: number | string;
    }
}

export {};
