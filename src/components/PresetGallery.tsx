import { presets, presetDescriptions } from "../styles/presets";
import { Diagram } from "../diagrams/Diagram";
import { Icon } from "./Icon";
export function PresetGallery({
  current,
  onChoose,
  onClose,
  modified,
}: {
  current: string;
  onChoose: (id: string) => void;
  onClose: () => void;
  modified: boolean;
}) {
  return (
    <>
      <div className="modal-heading">
        <div>
          <div className="eyebrow">A STARTING POINT, NOT A LIMIT</div>
          <h2>Find your visual language.</h2>
          <p>Same diagram. Four distinct styles. Make one your own.</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close presets"
        >
          <Icon name="close" />
        </button>
      </div>
      {modified && (
        <div className="notice">
          <Icon name="info" size={15} />
          Switching presets replaces your edits. You can undo the switch or
          export JSON first.
        </div>
      )}
      <div className="preset-gallery">
        {presets.map((p, i) => (
          <button
            key={p.id}
            className={`preset-card ${current === p.id ? "current" : ""}`}
            onClick={() => onChoose(p.id)}
          >
            <div
              className="preset-thumbnail"
              style={{ background: p.colors.background }}
            >
              <Diagram config={p} type="Flowchart" />
            </div>
            <div className="preset-card-info">
              <div>
                <b>{p.name}</b>
                {current === p.id && (
                  <span className="current-badge">
                    <Icon name="check" size={12} />
                    Current
                  </span>
                )}
              </div>
              <p>{presetDescriptions[i]}</p>
              <div className="preset-palette">
                {["primary", "secondary", "accent", "input", "output"].map(
                  (key) => (
                    <i
                      key={key}
                      style={{
                        background: p.colors[key as keyof typeof p.colors],
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="modal-footnote">
        The application stays in Precision Lab. Presets change your diagrams and
        exported rules.
      </div>
    </>
  );
}
