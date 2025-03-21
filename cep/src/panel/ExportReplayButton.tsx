import { ButtonGroup, Checkbox, Footer, Item, Picker, ProgressBar } from '@adobe/react-spectrum';
import { ActionButton } from '@adobe/react-spectrum';
import { TextField } from '@adobe/react-spectrum';
import { Flex } from '@adobe/react-spectrum';
import { Content, Divider, Heading } from '@adobe/react-spectrum';
import { Dialog } from '@adobe/react-spectrum';
import { Button } from '@adobe/react-spectrum';
import { DialogTrigger } from '@adobe/react-spectrum';
import {ToastContainer, ToastQueue} from '@adobe/react-spectrum'
import * as React from 'react';
import Replay from '@spectrum-icons/workflow/Replay';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import { Text } from '@adobe/react-spectrum';
import { useTranslation } from 'react-i18next';
import { exportTempFolderPath, finalJPGPath } from './constants';
import { FPS } from './constants';


function ExportReplayButton({configData, documentValue, exportSettings, progress, setProgress}) {
    const { t } = useTranslation();

    const [, forceUpdate] = React.useState({});

    const estimateDuration = () => {
        return Math.floor(documentValue.count / FPS) + 3;
    }
    
    //@ts-ignore
    const cs = new CSInterface();

    const showError = (error) => {
        const errorProperties = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});
        const script = "$.f_record.showError('" + encodeURIComponent(JSON.stringify(errorProperties, null, 2)).replace(/[!'()*]/g, c => 
            '%' + c.charCodeAt(0).toString(16).toUpperCase()
        ) + "')";
        cs.evalScript(script);
    }

    const prepareExportParams = async () => {
        const exportParams = {
            configData: configData.current,
            documentValue: documentValue,
            exportSettings: exportSettings.current,
            exportTempFolderPath: exportTempFolderPath,
        }

        //@ts-ignore
        if (isExist(exportTempFolderPath)) {
            //@ts-ignore
            deleteDir(exportTempFolderPath);
        }
        //@ts-ignore
        createDir(exportTempFolderPath);
        
        await new Promise((resolve, reject) => {
            cs.evalScript("$.f_record.generateFinalJPG('" + encodeURIComponent(finalJPGPath) + "')", function(result) {
                //@ts-ignore
                if (result === EvalScript_ErrMessage){
                    reject(new Error(result));
                }
                resolve(null);
            });
        });
        return exportParams;
    }

    const clickConfirm = async (close) => {
        //@ts-ignore
        const result = window.cep.fs.showSaveDialogEx(t("Select Export Path"), "", ["mp4"], documentValue.name + ".mp4", "MP4 (*.mp4)");
        if (result.err === 0 && result.data !== "") {
            exportSettings.current.savePath = result.data;
            close();
            
            setProgress({
                status: "",
                percent: 0
            });
            exportSettings.current.isExporting = true;
            forceUpdate({});
            ToastQueue.info(t('Start to export'), {timeout: 5000});
            

            let exportParams = null;
            try {
                exportParams = await prepareExportParams();
            } catch (error) {
                ToastQueue.negative(t('Export failed'), {
                    actionLabel: t('Details'),
                    onAction: () => showError(error)
                });
                exportSettings.current.isExporting = false;
                forceUpdate({});
                return;
            }
            try{
                //@ts-ignore
                await exportReplay(exportParams, (nowProgress) => {
                    setProgress(nowProgress);
                });
                ToastQueue.positive(t('Export success'), {
                    actionLabel: t('Open'),
                    onAction: () => {
                        try {
                            //@ts-ignore
                            openLocalPath(exportSettings.current.savePath);
                        } catch (error) {
                            //pass
                        }
                    }
                });
            } catch (error) {
                ToastQueue.negative(t('Export failed'), {
                    actionLabel: t('Details'),
                    onAction: () => showError(error)
                });
            } finally {
                exportSettings.current.isExporting = false;
                forceUpdate({});
            }
        }
    }

    return (
        <>
            <ToastContainer placement="bottom" />
            {!exportSettings.current.isExporting ? (
                <DialogTrigger isDismissable>
                    <Button 
                        variant="accent" 
                        isDisabled={!documentValue.id || !documentValue.count}
                    >
                        <Replay />
                        <Text>{t('Export')}</Text>
                    </Button>
                    {(close) => (
                        <Dialog>
                            <Content>
                                <Flex direction="column">
                                    <Flex direction="row" justifyContent="space-between" marginBottom="size-100">
                                        <Text>{t('Aspect Ratio')}</Text>
                                        <Picker aria-label="Replay Aspect Ratio"
                                            selectedKey={exportSettings.current.aspectRatio}
                                            onSelectionChange={(key: string) => {
                                                exportSettings.current.aspectRatio = key;
                                                forceUpdate({});
                                            }}
                                            width="size-1600">
                                            <Item key="1.7778">16:9</Item>
                                            <Item key="1.3333">4:3</Item>
                                            <Item key="1">1:1</Item>
                                            <Item key="0.75">3:4</Item>
                                            <Item key="0.5625">9:16</Item>
                                            <Item key="0">{t('match canvas')}</Item>
                                        </Picker>
                                    </Flex>
                                    <Flex direction="row" justifyContent="space-between" marginBottom="size-300">
                                        <Text>{t('Duration')}</Text>
                                        <Picker aria-label="Replay Duration"
                                            selectedKey={exportSettings.current.duration}
                                            onSelectionChange={(key: string) => {
                                                exportSettings.current.duration = key;
                                                forceUpdate({});
                                            }}
                                            width="size-1600">
                                            {15 < estimateDuration() && <Item key="15">{15 + t('s')}</Item>}
                                            {30 < estimateDuration() && <Item key="30">{30 + t('s')}</Item>}
                                            {60 < estimateDuration() && <Item key="60">{60 + t('s')}</Item>}
                                            {180 < estimateDuration() && <Item key="180">{180 + t('s')}</Item>}
                                            <Item key="0">{estimateDuration() + t('s') + ' ' + t('(original)')}</Item>
                                        </Picker>
                                    </Flex>
                                    <Flex justifyContent="center">
                                        <Button
                                            variant="accent"
                                            onPress={() => {
                                                clickConfirm(close);
                                            }}
                                            width="size-1200"
                                        >
                                            {t('Confirm')}
                                        </Button>
                                    </Flex>
                                </Flex>
                            </Content>
                        </Dialog>
                    )}
                </DialogTrigger>
            ) : (
                <ProgressBar value={progress.percent} label={t(progress.status)} width="size-2400" />
            )}
        </>
    );
};

export default ExportReplayButton; 