import { Fragment, FunctionComponent, ReactElement, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import Record, { IFieldType } from "./Record";
import { useFormikContext } from "formik";
import lodash from "lodash";
import { useAccordionState } from "../hooks";
import { useParams } from "react-router-dom";

export interface IRecordsProps {
  collapsible?: boolean;
  defaultOpen?: boolean;
  title: string;
  name: string;
  fields: (index: number) => IFieldType[];
  newValue: any;
  renderLayout?: (elements: ReactElement[]) => ReactElement;
  renderField?: (element: ReactElement, field: IFieldType) => ReactElement;
  renderRemove?: (element: ReactElement) => ReactElement;
  renderBorder?: () => ReactElement;
}

const Records: FunctionComponent<IRecordsProps> = (
  props: IRecordsProps
): ReactElement => {
  const {
    collapsible = true,
    defaultOpen = false,
    title,
    name,
    fields,
    newValue,
    renderLayout,
    renderField,
    renderRemove,
    renderBorder
  } = props;

  const formik = useFormikContext();
  const items = lodash.get(formik.values, name);

  const { uuid } = useParams<{ uuid: string }>();

  const id = `${uuid}.${name}`;
  const { open, toggle } = useAccordionState(id, defaultOpen);

  const handleNew = useCallback(() => {
    formik.setFieldValue(`${name}[${items.length}]`, newValue);
  }, [formik, items.length, name, newValue]);

  const handleRemove = useCallback(
    (index: number) => {
      const newOptions = items.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(name, newOptions);
    },
    [formik, items, name]
  );

  if (!items) {
    throw new Error(`"${name}" is falsy.`);
  }

  if (!Array.isArray(items)) {
    throw new Error(`Expected "${name}" to be an array.`);
  }

  const empty = items && items.length === 0;

  return (
    <Collapsible
      open={!collapsible || open}
      onOpenChange={toggle}
      className="w-full min-w-0 space-y-3"
    >
      {collapsible ? (
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between px-2"
          >
            <span>{title || name}</span>
            {open ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      ) : (
        title && <h3 className="text-sm font-medium">{title}</h3>
      )}
      <CollapsibleContent className="space-y-3">
        {!empty ? (
          <div className="flex w-full flex-col gap-4">
            {items.map((_: unknown, index: number) => (
              <Fragment key={index}>
                <Record
                  index={index}
                  label={title || name}
                  fields={fields(index)}
                  onRemove={handleRemove}
                  renderLayout={renderLayout}
                  renderField={renderField}
                  renderRemove={renderRemove}
                />
                {renderBorder && renderBorder()}
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items available</p>
        )}
        <Button
          variant="outline"
          size="sm"
          aria-label={`Add ${title || name} item`}
          onClick={handleNew}
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Records;
